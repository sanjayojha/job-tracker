# Project Spec: Job Application Tracker

## 1. Purpose

A single-user web application to track job applications through their lifecycle, replacing an ad hoc spreadsheet with a system that has status pipelines, reminders, and background automation. Secondary purpose: serve as the primary vehicle for learning an agentic (Claude Code) development workflow, so the build process itself is a deliverable alongside the app.

## 2. Who is this for

- Primary: me, actively job hunting, needing one place to see application status and be reminded to follow up.
- Secondary (interview framing): demonstrates to employers that I can design and build a production-shaped Laravel API + React SPA, including the "boring but essential" senior-level plumbing (queues, scheduling, notifications, cloud storage) — not just CRUD.

## 3. Problems it solves

- No visibility into which applications are stale and need a follow-up
- No history of how an application moved through stages
- No central place for resumes/cover letters used per application
- No lightweight way to get nudged (email/in-app) instead of manually checking a spreadsheet

## 4. What the product does (functional summary)

- Tracks companies and job applications with a defined status pipeline
- Lets me attach documents (resume version, cover letter) per application, stored on S3
- Sends me reminder notifications (email + in-app) when an application has been stale past a threshold
- Runs a daily scheduled check for staleness rather than relying on me remembering to look
- Logs status-change history per application (audit trail)
- Presents a dashboard with status counts and basic stats, backed by cached aggregates

## 5. Jobs to be done

- "When I apply somewhere, let me log it in under 30 seconds."
- "Tell me when I've gone quiet on something so I don't drop the ball."
- "Show me, at a glance, how many things are in each stage right now."
- "Keep a record of which resume version I sent where."
- "Let me review, later, how long things typically sit in each stage."

## 6. Tech stack

| Layer                 | Choice                                                                                     | Notes                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Backend framework     | Laravel 13.x                                                                               | REST API only, no Blade views for app functionality                                                  |
| Frontend              | React 19 + Vite                                                                            | Separate SPA, no Next.js, consumes REST API only                                                     |
| API auth              | Laravel Sanctum (SPA authentication, cookie-based)                                         | Standard Laravel-recommended approach for a first-party SPA talking to its own API                   |
| Database              | PostgreSQL 18                                                                              | See §10.2                                                                                            |
| Cache / Queue backend | Redis                                                                                      | Used for both cache driver and queue connection                                                      |
| Queues                | Laravel Jobs + `redis` queue driver, Horizon for monitoring                                | Reminder dispatch, notification sending, any file post-processing                                    |
| Scheduling            | Laravel Task Scheduling (`routes/console.php` / scheduled commands) via cron on the server | Daily staleness scan                                                                                 |
| Notifications         | Laravel Notifications (mail + database channels)                                           | Database channel powers in-app notification bell                                                     |
| File storage          | AWS S3 via Laravel's `s3` filesystem disk                                                  | Presigned uploads from React where practical                                                         |
| Mail                  | Laravel Mail, queued mailables                                                             | Use Mailtrap or SES sandbox in dev                                                                   |
| Events                | Laravel Events/Listeners                                                                   | `ApplicationStatusChanged`, `ApplicationStale`                                                       |
| AI tooling            | Laravel Boost (MCP server)                                                                 | Gives Claude Code live app introspection: routes, models, schema, Artisan commands, Tinker execution |
| CI/CD                 | GitHub Actions                                                                             | Lint (Pint) → test (Pest/PHPUnit) → build → deploy                                                   |
| Hosting               | AWS (EC2 or Laravel Forge-managed EC2 to start; ECS Fargate is a stretch goal)             | RDS for DB, ElastiCache for Redis, S3 for storage                                                    |
| Testing               | Pest                                                                                       | Feature tests for API endpoints, unit tests for job/notification logic                               |

## 7. Engineering requirements

- API-first: every piece of app functionality is exposed via a versioned REST API (`/api/v1/...`); the React app is just one consumer of it.
- All non-trivial or slow work (notification dispatch, file post-processing, future email parsing) happens in a queued Job — nothing blocking runs in the request/response cycle.
- Status changes go through a single service/action class that fires the `ApplicationStatusChanged` event, rather than being set ad hoc in multiple controllers — this is what makes the audit log and reminder-recalculation logic reliable.
- Scheduled command(s) are idempotent — running the staleness check twice in a day shouldn't double-send reminders.
- Dashboard aggregate stats are cached in Redis with a sensible TTL and invalidated (not just expired) on relevant writes.
- File uploads validated server-side (type, size) regardless of any client-side checks.
- Environment-driven config for everything environment-specific (mail driver, queue driver, filesystem disk) so local/staging/prod differ only by `.env`.
- Test coverage on: status transition logic, staleness-detection logic, and notification dispatch — these are the parts most likely to silently break.

## 8. Architecture

```
┌─────────────────┐         ┌──────────────────────┐
│   React SPA      │◄───────►│  Laravel REST API     │
│  (Vite, React 19)│  HTTPS  │  (Sanctum SPA auth)    │
└─────────────────┘         └──────────┬────────────┘
                                        │
                     ┌──────────────────┼───────────────────┐
                     │                  │                   │
              ┌──────▼─────┐    ┌───────▼───────┐   ┌───────▼───────┐
              │ PostgreSQL  │    │     Redis      │   │      S3        │
              │ (app data)  │    │ (cache+queue)  │   │  (attachments)  │
              └────────────┘    └───────┬───────┘   └────────────────┘
                                         │
                                 ┌───────▼────────┐
                                 │  Queue Worker    │
                                 │ (Horizon-managed)│
                                 │  Jobs, Listeners  │
                                 └───────┬────────┘
                                         │
                                 ┌───────▼────────┐
                                 │  Mail / Notif.   │
                                 │   (SES / SMTP)   │
                                 └────────────────┘

Scheduler (cron → `schedule:run`) triggers the daily staleness-scan command,
which queries stale applications and dispatches reminder Jobs.
```

## 9. System design notes

- **Repo layout**: single monorepo with `/backend` (Laravel) and `/frontend` (React/Vite) — see §10.1.
- **Auth flow**: Sanctum SPA authentication (session cookie + CSRF token), not token-based API auth, since the React app is first-party and same-origin (or configured as a trusted origin) — this is the Laravel-recommended pattern for a first-party SPA, not full OAuth/Passport.
- **Status pipeline** stored as an enum-backed column, not free text, with a dedicated `ApplicationStatusHistory` table for the audit trail.
- **Staleness definition**: configurable threshold (e.g. no status change in 10 days while not already Rejected/Withdrawn/Offer) — kept as config, not hardcoded, so it's easy to tune.
- **Notification channels**: `mail` + `database` initially; `broadcast` channel intentionally deferred (see brainstorm.md — real-time is reserved for the flagship SaaS project).
- **File storage path convention**: `applications/{application_id}/{uuid}-{original_filename}` on the `s3` disk, with presigned GET URLs generated on demand rather than public bucket access.
- **Deployment target for V1**: single EC2 instance (or Forge-provisioned) is enough — ECS/Fargate is a stretch goal, not a requirement, since infra complexity isn't the point of this particular project.

## 10. Decisions (resolved at scaffold time)

1. **Repo layout → monorepo.** Single git repo with `/backend` (Laravel) and `/frontend` (React/Vite). Keeps the API and its consumer in one Claude Code context so contract changes stay in sync, and avoids doubling the CI/deploy setup for a solo project.
2. **Database → PostgreSQL 18.** Preferred over MySQL 8 on general merit; DDEV supports `postgres:18` directly and RDS supports it equally well for deploy, so there was no cost to taking the preference.
3. **Deploy target → still open, deliberately deferred.** Nothing about the local build depends on it, and deciding between plain EC2, Forge, and Fargate is better done once there is something to deploy. Revisit before V1 ships.
4. **Horizon → deferred to V1, not MVP.** The earlier lean was to add it early for queue visibility, and that reasoning still holds — but it belongs with the queue work itself (switching `QUEUE_CONNECTION` to `redis`, writing the first Job), not with the scaffold. Adding it against a queue nothing dispatches to would teach nothing.

**Also decided, though not in the original list:**

5. **Dev environment → DDEV.** Docker-based, no host PHP install, and already in daily use on this machine. Provides PHP 8.4, Composer, Node 24, Postgres 18, Redis (add-on), and Mailpit. Chosen over Laravel Sail, which is a thinner tool that would have meant learning a second container workflow for no gain. Note: this project's Mailpit runs on 8035/8036 rather than the DDEV default, because a standalone Mailpit container on the host already holds 8025/8026.
6. **Frontend language → TypeScript.** Gives a type-checkable contract against the API, which matters more than usual when an agent is writing much of the client code.
