# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries describe **user- or developer-visible changes**, not individual commits — git history already covers commits. Group them under `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security`.

## [Unreleased]

### Added

- DDEV development environment: PHP 8.4, PostgreSQL 18, Redis, Node 24, Mailpit, with the Vite dev server published through ddev-router
- Laravel 13 REST API scaffold in `backend/`
- React 19 + Vite SPA scaffold in `frontend/`, TypeScript
- Tailwind CSS 4, wired as a Vite plugin
- Laravel Boost with an MCP server for agent introspection of the app
- `docs/architecture.md`, `docs/project_status.md`, and this changelog
- `/update-docs-and-commit` slash command, which reconciles the `docs/` set with the working tree and then commits

### Changed

- `.ddev/` is no longer tracked in git; the environment is reproduced from the setup steps in `README.md`

[unreleased]: https://github.com/sanjayojha/job-tracker/commits/main
