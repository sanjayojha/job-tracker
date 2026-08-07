# Job Tracker

A single-user web app for tracking job applications through their lifecycle — status pipeline, staleness reminders, and an audit trail — replacing an ad hoc spreadsheet.

Secondary purpose: it is the vehicle for learning an agentic (Claude Code) development workflow, so the build process is a deliverable alongside the app. See [brainstorm.md](brainstorm.md) for the why and [project_spec.md](project_spec.md) for the what.

**Status:** scaffold only. No application code yet.

## Stack

| | |
|---|---|
| Backend | Laravel 13, PHP 8.4 — REST API only, no Blade views |
| Frontend | React 19 + Vite, TypeScript — separate SPA in `frontend/` |
| Database | PostgreSQL 18 |
| Cache / queue | Redis |
| Local env | DDEV |

Monorepo: `backend/` (Laravel) and `frontend/` (React). See [project_spec.md §10](project_spec.md) for the reasoning behind each choice.

## Local setup

`.ddev/` is **not** tracked in this repo, so the environment has to be recreated once per machine. These steps reproduce it exactly.

**Prerequisites:** [DDEV](https://ddev.readthedocs.io/en/stable/users/install/ddev-installation/) ≥ 1.25 and Docker. Nothing else — PHP, Composer, Node, Postgres, Redis, and Mailpit all live in containers.

### 1. Generate the DDEV config

```bash
ddev config \
  --project-name=job-tracker \
  --project-type=laravel \
  --docroot=backend/public \
  --php-version=8.4 \
  --database=postgres:18 \
  --nodejs-version=24
```

### 2. Add the settings `ddev config` can't set via flags

Append to `.ddev/config.yaml`:

```yaml
# Composer runs against the Laravel app, not the monorepo root.
composer_root: backend

# Vite dev server exposed through ddev-router.
web_extra_exposed_ports:
    - name: vite
      container_port: 5173
      http_port: 5172
      https_port: 5173

# Only needed if something else on your machine already holds 8025/8026
# (a standalone Mailpit container, or another DDEV project). Omit otherwise.
mailpit_http_port: "8035"
mailpit_https_port: "8036"
```

### 3. Add the Redis service and the `ddev vite` command

```bash
ddev add-on get ddev/ddev-redis
```

Create `.ddev/commands/web/vite`, then `chmod +x` it:

```bash
#!/bin/bash

## Description: Run the Vite dev server for the React SPA (frontend/)
## Usage: vite [flags] [args]
## Example: "ddev vite"

cd /var/www/html/frontend && npm run dev -- "$@"
```

### 4. Start and install

```bash
ddev start

cp backend/.env.example backend/.env
ddev artisan key:generate
ddev composer install
ddev artisan migrate

ddev exec --dir /var/www/html/frontend npm install
```

`.env.example` already points at DDEV's in-container service hostnames (`db`, `redis`, `localhost:1025`), so no editing is needed for local work.

## Running it

```bash
ddev start   # API + database + redis
ddev vite    # SPA dev server (foreground)
```

| | |
|---|---|
| API | https://job-tracker.ddev.site |
| SPA | https://job-tracker.ddev.site:5173 |
| Mailpit | https://job-tracker.ddev.site:8036 |

Common commands: `ddev artisan <cmd>`, `ddev composer <cmd>`, `ddev ssh`, `ddev logs -f`.

## Third-party credentials

None are needed to run this locally. The only external service the project will ever use is **AWS** — S3 for file attachments at V1, and optionally SES for production mail. Placeholders are in `backend/.env.example`; leave them blank until then.
