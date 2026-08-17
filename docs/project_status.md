# Project Status

**Last updated:** 2026-08-17
**Project start date:** 2026-08-07
**Current phase:** Phase 1 — MVP
**Next target date:** _not set_

Answers three questions: what the milestones are, what is done, and what is next. Update it whenever a milestone moves — a stale status file is worse than none, because it is read as current.

## Milestones

| Phase | Goal | Status |
| --- | --- | --- |
| 0. Foundation | Running dev environment, scaffolds, agentic tooling | ✅ Complete |
| 1. MVP | Replace the spreadsheet: auth, CRUD, status pipeline, dashboard | 🟡 In progress |
| 2. V1 | Automation layer: queues, scheduling, notifications, S3, Kanban | ⚪ Not started |
| 3. V2 | Stretch: email parsing, concurrency, weekly digest, analytics | ⚪ Not started |

Scope for each phase is defined in [brainstorm.md](../brainstorm.md); the MVP and V1 checklists there are the source of truth for what "done" means.

## Phase 0 — Foundation (complete)

### Accomplished

- [x] Monorepo initialised, pushed to GitHub
- [x] DDEV environment: PHP 8.4, PostgreSQL 18, Redis, Node 24, Mailpit
- [x] Laravel 13 API scaffold, migrating against PostgreSQL
- [x] React 19 + Vite + TypeScript SPA scaffold, HMR verified through ddev-router
- [x] Tailwind CSS 4 installed and verified compiling
- [x] Laravel Boost installed, MCP server reachable via `ddev artisan boost:mcp`
- [x] Open spec decisions resolved and recorded (project_spec.md §9)
- [x] Documentation set established: README, architecture, changelog, this file
- [x] First custom slash command: `/update-docs-and-commit`
- [x] Root `CLAUDE.md` with project conventions, environment rules, and design/UX guidelines
- [x] Pint available and passing (`ddev composer exec pint`) — ships with Laravel, no config needed
- [x] API scaffolding installed; routes versioned under `/api/v1/` and returning JSON
- [x] Frontend libraries chosen and wired: React Router 8, TanStack Query 5, no component library
- [x] Pest 4 configured, running against a real PostgreSQL `test` database
- [x] Sanctum SPA auth end to end: login, logout, session persistence and rate limiting, verified in a real browser
- [x] First real UI: login screen and session-gated app shell, hand-built on Tailwind
- [x] GitHub Actions CI: backend lint + tests, frontend lint + build, on push and PR

## Current phase: Phase 1 — MVP

### Accomplished

- [x] Companies and Applications migrations, models, and factories, with the status pipeline as an enum-backed column
- [x] `App\Enums\ApplicationStatus` pinned to the SPA's status list by a test that parses `frontend/src/features/applications/status.ts`
- [x] `application_status_histories` audit table, append-only, cascading from its application
- [x] `ChangeApplicationStatus` — the single transition funnel — and `CreateApplication`, both firing `ApplicationStatusChanged` after commit

- [x] `/api/v1/companies` CRUD, establishing the controller / Form Request / API Resource layering the rest of the API follows
- [x] Company names made case-insensitively unique, so the same employer cannot appear twice under different casing
- [x] `/api/v1/applications` CRUD, scoped to the authenticated user by `ApplicationPolicy`, with status/company/search filtering, pipeline-ordered sorting and pagination
- [x] `POST /applications/{id}/status` — the single transition endpoint; the resource `PATCH` refuses a `status` key
- [x] No-op transitions answer 422 instead of 500, closing the recorded `RuntimeException` gap

### Remaining in this phase
- [ ] Application list UI, sortable by date and status
- [ ] Dashboard with counts per status

## What's next

The SPA. The API is complete enough to build against: the application list has filtering, sorting and pagination behind it, and the dashboard's counts per status are the last backend piece.

The list UI comes first, because it is what replaces the spreadsheet. It reads `GET /api/v1/applications` directly — sorting and filtering are query parameters, not client-side work, so the list stays correct once it is longer than a page.

Nothing listens to `ApplicationStatusChanged` yet — dashboard cache invalidation and reminder scheduling are V1. The event is dispatched now so those listeners have a seam to attach to.

## Known gaps and risks

- **Deploy target undecided.** No infrastructure exists. Needs resolving before V1 ships (project_spec.md §9.3).
- **Documentation drift.** The `docs/` files are maintained by hand. If they fall behind the code, an agent will follow them confidently and be wrong.
- **`.ddev/` is untracked**, so the environment lives only in `README.md`'s setup steps. Changes to the DDEV config must be mirrored there manually or they are lost.
