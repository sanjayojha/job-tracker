# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries describe **user- or developer-visible changes**, not individual commits — git history already covers commits. Group them under `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security`.

## [Unreleased]

### Added

- Companies and applications data model: `companies` (unique name, website, notes) and `applications` (title, status, applied date, source URL, notes), with applications owned by a user and cascading from their company
- `App\Enums\ApplicationStatus` — the seven-stage pipeline as a backed enum, kept identical to the SPA's status list by a test that reads the TypeScript
- Status pipeline write path: every status change goes through one action that records an `application_status_histories` row and fires `ApplicationStatusChanged`. Creating an application counts as the first transition, so the trail is never empty. Any stage may follow any other; only a move to the stage already held is refused
- CI no longer runs for prose-only changes; `**.md`, `docs/**` and `.claude/**` are in `paths-ignore`, while a commit touching both prose and code still runs
- Design system based on IBM Carbon: Carbon Blue and Gray token scales, IBM Plex Sans and Mono self-hosted via `@fontsource`, Phosphor icons at Light weight, square corners enforced at the token level, and a restrained status-colour vocabulary

## [0.1.0] - 2026-08-10

Foundation release: a running development environment, a Laravel API and React SPA
that authenticate against each other, and CI. No job-tracking features yet.

### Added

- DDEV development environment: PHP 8.4, PostgreSQL 18, Redis, Node 24, Mailpit, with the Vite dev server started automatically by `ddev start` and published through ddev-router
- Laravel 13 REST API scaffold in `backend/`
- React 19 + Vite SPA scaffold in `frontend/`, TypeScript
- Tailwind CSS 4, wired as a Vite plugin
- Laravel Boost with an MCP server for agent introspection of the app
- `docs/architecture.md`, `docs/project_status.md`, and this changelog
- `/update-docs-and-commit` slash command, which reconciles the `docs/` set with the working tree and then commits
- Root `CLAUDE.md` carrying project conventions, environment rules, and design/UX guidelines for AI agents
- API scaffolding via `install:api` — `routes/api.php`, Sanctum, and JSON error rendering for `api/*`
- API routes are versioned under `/api/v1/` through `apiPrefix`
- React Router 8 (declarative mode) and TanStack Query 5, wired as providers in `frontend/src/main.tsx`
- Pest 4 as the test runner, with feature tests covering the health endpoint and API authentication
- Sanctum SPA authentication end to end: `POST /api/v1/login`, `POST /api/v1/logout`, `GET /api/v1/user`, rate-limited login, and CSRF via `/sanctum/csrf-cookie`
- Login screen and session-gated app shell in the SPA, with server state managed by TanStack Query
- Seeded single-user account, configurable via `SEED_USER_*` environment variables
- GitHub Actions CI: backend lint (Pint) and tests (Pest against a PostgreSQL 18 service), frontend lint (oxlint) and build, on every push to `main` and every pull request

### Changed

- Tests run against a real PostgreSQL `test` database instead of SQLite in-memory, so they exercise the engine the app deploys on
- `.ddev/` is no longer tracked in git; the environment is reproduced from the setup steps in `README.md`

[unreleased]: https://github.com/sanjayojha/job-tracker/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sanjayojha/job-tracker/releases/tag/v0.1.0
