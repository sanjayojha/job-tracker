# Architecture

High-level system architecture, data flow, and component relationships.

For _what_ the product does and _why_ each technology was chosen, see [project_spec.md](../project_spec.md). This document covers how the pieces fit together. Anything marked **planned** does not exist in the codebase yet.

## System Overview

A React SPA talking to a Laravel REST API over HTTPS, with all slow work pushed onto a Redis-backed queue rather than run inside the request cycle.

```
┌──────────────────┐         ┌────────────────────────┐
│    React SPA     │◄───────►│    Laravel REST API    │
│ (Vite, React 19) │  HTTPS  │   (Sanctum SPA auth)   │
└──────────────────┘         └───────────┬────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
             ┌──────▼──────┐     ┌───────▼───────┐    ┌───────▼───────┐
             │ PostgreSQL  │     │     Redis     │    │      S3       │
             │ (app data)  │     │ (cache+queue) │    │ (attachments) │
             └─────────────┘     └───────┬───────┘    └───────────────┘
                                         │
                                 ┌───────▼──────────┐
                                 │   Queue Worker   │
                                 │ (Horizon-managed)│
                                 │  Jobs, Listeners │
                                 └───────┬──────────┘
                                         │
                                 ┌───────▼──────────┐
                                 │   Mail / Notif.  │
                                 │   (SES / SMTP)   │
                                 └──────────────────┘
```

A scheduler (cron → `schedule:run`) triggers the daily staleness-scan command, which queries stale applications and dispatches reminder Jobs.

**Boundaries that matter:**

- The API is the only thing that touches the database. The SPA has no direct data access.
- Nothing slow runs in a web request. Notification dispatch, file post-processing, and any future email parsing go through the queue.
- The SPA is one consumer of a general-purpose API, not the API's reason for existing — every capability is reachable over `/api/v1/...` without a browser.

## Data Flow

**Auth path (login):** SPA `GET /sanctum/csrf-cookie` → Laravel sets an `XSRF-TOKEN` cookie → SPA `POST /api/v1/login` with that token URL-decoded into an `X-XSRF-TOKEN` header and `credentials: 'include'` → the `web` guard authenticates and the session ID is regenerated → the session cookie authenticates every later request. The SPA never holds a token; it asks `GET /api/v1/user` who it is, because the session cookie is `HttpOnly` and unreadable from JavaScript.

The SPA is on `:5173` and the API on `:443`. Different ports are different *origins* for CORS (hence `supports_credentials` and an explicit allowed origin), but the same *host* for cookies, which ignore port — so the session cookie is shared without any subdomain setup.

**Read path (dashboard):** SPA request → Sanctum session cookie authenticates → controller asks for aggregate stats → Redis cache hit returns immediately; on miss, the aggregate is computed from PostgreSQL, cached, and returned.

**Write path (status change):** SPA `POST /applications/{id}/status` (_planned_ — a transition gets its own endpoint rather than riding on the resource `PATCH`, which will reject `status` outright) → controller delegates to a single status-transition action (`App\Actions\ChangeApplicationStatus`) → action persists the new status and writes an `application_status_histories` row in one transaction, then fires `ApplicationStatusChanged` after commit → _planned:_ listeners invalidate the cached dashboard aggregates and recalculate the reminder schedule. Controllers never set status directly; that funnel is what keeps the audit log trustworthy. Creating an application is the first transition and goes through `App\Actions\CreateApplication`, which opens the trail with a null `from_status`.

The event is deliberately `ShouldDispatchAfterCommit`: a listener that invalidates a cache or sends mail must not run for a transition the database rolled back.

**Scheduled path (staleness):** cron runs `schedule:run` daily → the staleness-scan command queries applications with no status change inside the configured threshold → dispatches a reminder Job per application → the worker sends mail and writes a database notification. The scan is idempotent, so running it twice in a day does not double-send.

**Upload path:** SPA requests an upload target → server validates type and size → file lands on S3 under `applications/{application_id}/{uuid}-{original_filename}` → reads use presigned GET URLs generated on demand, never public bucket access.

## Component Architecture

Monorepo with two independently-built applications:

```
job-tracker/
├── backend/     Laravel 13 REST API
├── frontend/    React 19 + Vite SPA
└── docs/        This documentation
```

They share a repo for context and tooling convenience, not a runtime. Each deploys as its own artifact.

### Frontend Components

- **React 19 + Vite, TypeScript.** Separate SPA, no SSR framework.
- **Tailwind CSS 4** for styling — Vite plugin, no config file, theme via `@theme` in CSS. Design tokens (IBM Carbon palette, IBM Plex Sans, zero radius) live in `src/index.css` and are the source of truth for the visual system.
- **Phosphor icons** at Light weight, imported with the `Icon` suffix.
- **React Router 8** in declarative mode — client-side routing only, no loaders or framework features.
- **TanStack Query 5** over native `fetch` for all server state. Providers are wired in `src/main.tsx`.
- **No component library.** Components are hand-built on Tailwind, so accessibility is on us.
- Served in development from Vite on `:5173`, published through ddev-router. The API sits on `:443` of the same host; cookies are not port-scoped, so the Sanctum session cookie works across that split.

Server state lives entirely in the Query cache; there is no separate client-state store, because almost nothing in this app is client-only state. The cache invalidation on the client mirrors the Redis invalidation on the server — a mutation that changes an application's status must invalidate both the application list and the dashboard aggregates, or the two layers disagree.

_Planned:_ route structure and component organisation are established when the first real screens land.

### API Layers

Request path through the backend:

1. **Routes** — versioned under `/api/v1/...`, set via `apiPrefix` in `bootstrap/app.php`. `routes/api.php` holds them; exceptions render as JSON for `api/*`.
2. **Middleware** — Sanctum SPA authentication (session cookie + CSRF token), not token-based API auth, since the SPA is first-party. Not OAuth/Passport. `statefulApi()` in `bootstrap/app.php` makes API requests session-backed **only when their `Origin`/`Referer` is in `SANCTUM_STATEFUL_DOMAINS`**; anything else falls through to token auth and has no session at all.
3. **Form Requests** — validation, including server-side file type and size checks regardless of client-side validation.
4. **Controllers** — thin; they translate HTTP to domain calls and back.
5. **Actions / Services** — the domain layer. Status transitions in particular live in a single action class.
6. **Eloquent Models** — persistence.
7. **API Resources** — response shaping, so the wire format is decoupled from the table schema.

**Key domain rules:**

- Status pipeline is an **enum-backed column**, not free text, with a dedicated `ApplicationStatusHistory` table for the audit trail.
- Staleness threshold is **config, not hardcoded** — e.g. no status change in 10 days while not already Rejected/Withdrawn/Offer.

### Library Modules

Cross-cutting backend pieces, all Laravel-native rather than custom abstractions:

- **Jobs** — queued work on the `redis` connection, monitored by Horizon.
- **Events / Listeners** — `ApplicationStatusChanged`, `ApplicationStale`. This is the seam between a status change and its side effects.
- **Notifications** — `mail` + `database` channels; the database channel powers the in-app bell. The `broadcast` channel is deliberately deferred, since real-time is reserved for a different project.
- **Console Commands** — the scheduled staleness scan.
- **Filesystem disks** — `s3` for attachments, environment-driven so local and production differ only by `.env`.

## Environments

Local development runs entirely in DDEV containers — see [README.md](../README.md) for setup.

Production targets AWS: RDS for PostgreSQL, ElastiCache for Redis, S3 for attachments, and a single EC2 instance (or Forge-provisioned) for V1. ECS/Fargate is a stretch goal, not a requirement — infrastructure complexity is not the point of this project. The specific target is still undecided; see project_spec.md §9.3.
