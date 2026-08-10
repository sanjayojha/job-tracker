# Job Tracker

A single-user web app for tracking job applications through their lifecycle — status pipeline, staleness reminders, and an audit trail — replacing an ad hoc spreadsheet.

**Status:** scaffold only. No application code yet.

## Stack

|               |                                                           |
| ------------- | --------------------------------------------------------- |
| Backend       | Laravel 13, PHP 8.4 — REST API only, no Blade views       |
| Frontend      | React 19 + Vite, TypeScript — separate SPA in `frontend/` |
| Styling       | Tailwind CSS 4 (Vite plugin, no config file)              |
| Database      | PostgreSQL 18                                             |
| Cache / queue | Redis                                                     |
| Local env     | DDEV                                                      |
| AI tooling    | Laravel Boost (MCP) — see below                           |

Monorepo: `backend/` (Laravel) and `frontend/` (React). See [project_spec.md §9](project_spec.md) for the reasoning behind each choice.

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

# Run Vite automatically with `ddev start`. Requires frontend/node_modules,
# so the daemon will restart-loop until step 4's npm install has run.
web_extra_daemons:
    - name: vite
      command: "npm run dev"
      directory: /var/www/html/frontend

# Only needed if something else on your machine already holds 8025/8026
# (a standalone Mailpit container, or another DDEV project). Omit otherwise.
mailpit_http_port: "8035"
mailpit_https_port: "8036"
```

### 3. Add the Redis service and the `ddev vite` command

```bash
ddev add-on get ddev/ddev-redis
```

Create `.ddev/commands/web/vite`, then `chmod +x` it. Vite itself is started by
the daemon above; this command controls that process:

```bash
#!/bin/bash

## Description: Control the Vite dev server daemon (frontend/)
## Usage: vite [status|restart|stop|start]
## Example: "ddev vite restart"

DAEMON=webextradaemons:vite
ACTION="${1:-status}"

case "$ACTION" in
    status | restart | stop | start)
        supervisorctl "$ACTION" "$DAEMON"
        ;;
    *)
        echo "Usage: ddev vite [status|restart|stop|start]" >&2
        echo "For output: ddev logs -f" >&2
        exit 1
        ;;
esac
```

### 4. Start and install

```bash
ddev start

cp backend/.env.example backend/.env
ddev artisan key:generate
ddev composer install
ddev artisan migrate

ddev exec --dir /var/www/html/frontend npm install

# Tests run against a real PostgreSQL database, not SQLite. Create it once:
ddev exec 'psql -h db -U db -d db -c "CREATE DATABASE test OWNER db;"'
```

`.env.example` already points at DDEV's in-container service hostnames (`db`, `redis`, `localhost:1025`), so no editing is needed for local work.

## Running it

```bash
ddev start   # everything: API, database, redis, and the Vite dev server
```

Vite runs as a DDEV daemon, so there is no second command to remember and the
SPA cannot be silently down while the API is up.

|         |                                    |
| ------- | ---------------------------------- |
| API     | https://job-tracker.ddev.site      |
| SPA     | https://job-tracker.ddev.site:5173 |
| Mailpit | https://job-tracker.ddev.site:8036 |

To inspect or bounce the dev server: `ddev vite status`, `ddev vite restart`.
Its output goes to `ddev logs -f`.

Common commands: `ddev artisan <cmd>`, `ddev composer <cmd>`, `ddev ssh`, `ddev logs -f`. Both `artisan` and `composer` resolve to `backend/` on their own via `composer_root`. npm does not, so use `ddev exec --dir /var/www/html/frontend npm <cmd>`.

## Styling

Tailwind CSS 4, which is configured very differently from v3 — most tutorials still describe v3:

- There is **no `tailwind.config.js` and no `postcss.config.js`**, and no `content` globs to maintain. v4 finds source files itself.
- It is wired as a Vite plugin in `frontend/vite.config.ts`, not through PostCSS.
- The entry point is `@import 'tailwindcss'` in `frontend/src/index.css` — not v3's `@tailwind base/components/utilities`.
- Theme customisation goes in CSS inside `@theme { }`, not a JS config object.

`frontend/src/index.css` still holds the Vite starter's own CSS below the import. Delete it when real UI work begins.

## AI tooling (Laravel Boost)

Boost is a dev dependency that runs an MCP server, giving the coding agent live introspection of this app — schema, routes, config, logs, and version-correct Laravel docs — instead of guessing.

`.mcp.json` at the repo root is tracked, so it works on clone with no setup beyond `ddev composer install`. One thing to be aware of if you ever regenerate it: `php artisan boost:install` writes `"command": "php"`, which **cannot work here** — MCP servers launch as host processes and there is no PHP on the host. The tracked config routes through DDEV instead:

```json
{
    "mcpServers": {
        "laravel-boost": {
            "command": "ddev",
            "args": ["artisan", "boost:mcp"]
        }
    }
}
```

Claude Code loads MCP servers at startup, so restart it after any change here. DDEV must be running.

`backend/CLAUDE.md` is generated by Boost and is **overwritten on every `boost:install`** — put project-specific instructions in the root `CLAUDE.md` instead.

## Third-party credentials

None are needed to run this locally. The only external service the project will ever use is **AWS** — S3 for file attachments at V1, and optionally SES for production mail. Placeholders are in `backend/.env.example`; leave them blank until then.
