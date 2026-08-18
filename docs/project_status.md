# Project Status

**Last updated:** 2026-08-18
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

- [x] Application list UI at `/applications` — filtering, sorting and pagination, with all list state held in the URL
- [x] Frontend testing: Vitest + React Testing Library, wired into CI alongside lint and build

- [x] Create an application from the SPA at `/applications/new` — company and role title required, everything else behind a disclosure, verified end to end in a browser including the audit trail the create writes
- [x] Company picker: type-to-filter combobox with inline company creation, built on Downshift's `useCombobox` for keyboard and screen-reader behaviour. This closes the component-library question — one headless hook for this component, no library
- [x] `lib/api.ts` covered by tests: CSRF handling, session credentials, `204`s and `ApiError` field errors

### Remaining in this phase
- [ ] Edit an existing application from the SPA, and move its stage. `PATCH /applications/{id}` and `POST /applications/{id}/status` both exist and are unused by the SPA; the list has no row-level link into a detail or edit view yet
- [ ] Dashboard with counts per status — **deferred until after the list UI**. Note that no endpoint exists yet: this is a backend task (an aggregate endpoint under `/api/v1`, Redis-cached per `architecture.md`'s read path) followed by a UI one, not UI work alone
- [ ] Deployment target — in the MVP checklist in [brainstorm.md](../brainstorm.md) but not previously tracked here. To be decided after the list UI; it can force changes to the queue driver, session store and asset build

## What's next

Editing an application, and moving its stage, from the SPA. Logging one now works, so the spreadsheet can be replaced for new entries — but an application can still only be corrected or advanced by calling the API by hand, and the stage moving is the pipeline's whole point.

The API needs nothing new for it: `PATCH /applications/{id}` covers the fields and refuses `status`, and `POST /applications/{id}/status` is the one transition endpoint. The open question is the shape of the UI — whether rows link to a detail screen that shows the status history, or the list edits in place.

Nothing listens to `ApplicationStatusChanged` yet — dashboard cache invalidation and reminder scheduling are V1. The event is dispatched now so those listeners have a seam to attach to.

## Known gaps and risks

- **Deploy target undecided.** No infrastructure exists. Needs resolving before V1 ships (project_spec.md §9.3).
- **No database seeder for development data.** The dev database's applications and companies were created ad hoc through `tinker`; only the user account is seeded. A `migrate:fresh` destroys them with no way back. Anything seeded must go through `CreateApplication`, or it will have no audit trail.
- **Documentation drift.** The `docs/` files are maintained by hand. If they fall behind the code, an agent will follow them confidently and be wrong.
- **`.ddev/` is untracked**, so the environment lives only in `README.md`'s setup steps. Changes to the DDEV config must be mirrored there manually or they are lost.
