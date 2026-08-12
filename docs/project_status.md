# Project Status

**Last updated:** 2026-08-12
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

### Remaining in this phase

- [ ] `ApplicationStatusHistory` audit table
- [ ] A single status-transition action firing `ApplicationStatusChanged`
- [ ] `/api/v1` CRUD for companies and applications
- [ ] Application list UI, sortable by date and status
- [ ] Dashboard with counts per status

## What's next

Finish the pipeline's write path: the `ApplicationStatusHistory` table and the single transition action that fires `ApplicationStatusChanged`. That funnel has to exist before the CRUD endpoints, because `status` is deliberately not mass-assignable — creating an application goes through the action too.

## Known gaps and risks

- **Deploy target undecided.** No infrastructure exists. Needs resolving before V1 ships (project_spec.md §9.3).
- **Documentation drift.** The `docs/` files are maintained by hand. If they fall behind the code, an agent will follow them confidently and be wrong.
- **`.ddev/` is untracked**, so the environment lives only in `README.md`'s setup steps. Changes to the DDEV config must be mirrored there manually or they are lost.
