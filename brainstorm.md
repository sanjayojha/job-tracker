# Brainstorm: Job Application Tracker

## Why this project exists (two goals, don't conflate them)

1. **Practical**: I'm actively job hunting. I want a tool that tracks applications, reminds me to follow up, and gives me a dashboard of where things stand, instead of a messy spreadsheet.
2. **Learning**: This is my first real project built primarily _with_ Claude Code rather than _by hand_. The point is to learn agentic dev workflows — CLAUDE.md setup, skills, MCP (Laravel Boost), sub-agents, planning mode, slash commands — using a codebase simple enough that I can tell when the _agent_ is doing something wrong vs. when the _problem_ is just hard.

**Guardrail**: this project stays deliberately light on custom feature complexity. If a feature idea doesn't teach me a new Claude Code workflow AND isn't something I'll actually use in my job search, it doesn't make the cut for V1. Feature creep here defeats the purpose — save the ambitious feature list for the Document Processing SaaS project instead.

## Problem

Right now job search tracking is a spreadsheet: no reminders, no history of status changes, no view of "what needs my attention today." Recruiters' emails come in ad hoc and don't connect back to which application they're about.

## Who it's for

Just me, initially. Single-user. No public sign-up flow needed for V1 — this isn't the SaaS project. (Could open it up later if useful, but that's explicitly out of scope for now.)

## MVP (ship this first, smallest usable version)

Goal: replace the spreadsheet.

- [ ] Auth: single user login (Laravel Fortify + Sanctum for the API, React SPA consuming it)
- [ ] CRUD: Companies, Applications (job title, company, status, applied date, source URL, notes)
- [ ] Status pipeline: Wishlist → Applied → Screening → Interview → Offer → Rejected/Withdrawn
- [ ] Simple dashboard: counts per status, list view sortable by date/status
- [ ] React SPA (Vite) talking to Laravel REST API — no Kanban drag-and-drop yet, just a table/list
- [ ] Deployed somewhere reachable (even just a basic single EC2/Forge box) so it's actually usable day to day

**Claude Code learning targets for MVP**: CLAUDE.md authoring, Laravel Boost install + first use, basic planning-mode workflow ("plan then execute"), first custom slash command (e.g. `/new-migration`), scaffolding a Laravel API + separate Vite/React app in one repo or two repos (decide during spec).

## V1 (this is what actually justifies the tech-skill list)

Goal: the automation/background-processing layer that makes this a portfolio piece, not just a CRUD app.

- [ ] Kanban board UI (drag-and-drop status changes) — reuse patterns from TaskFlow Pro
- [ ] File attachments per application (resume version used, cover letter) → **S3**
- [ ] **Notifications**: follow-up reminder if no status change in N days (queued mailable + in-app/database notification)
- [ ] **Task Scheduling**: daily scheduled command that scans stale applications and dispatches reminder notifications
- [ ] **Jobs/Queues**: any "recruiter email parsing" or attachment processing runs async, not inline in the request
- [ ] **Events/Listeners**: `ApplicationStatusChanged` event → triggers reminder recalculation + activity log entry
- [ ] Activity/audit log per application (status change history, not just current status)
- [ ] Redis: cache dashboard aggregate stats (counts, response-rate %) instead of recomputing every load

**Claude Code learning targets for V1**: sub-agent usage (e.g. a dedicated "test-writer" or "reviewer" sub-agent), using Boost's app-introspection tools (routes/models/schema) so the agent stops guessing at my schema, a custom skill for "how I want queued jobs structured in this repo," multi-step planning for a feature that spans migration → job → event → listener → notification.

## V2 (only if V1 feels solid and I still want to keep going)

Goal: stretch goals, mostly to exercise Concurrency and richer integration.

- [ ] Recruiter email parsing: forward emails to a dedicated inbox, queued Job parses and matches to an existing application (or flags for manual match)
- [ ] Optional: light scraping/checking of a small set of job boards for saved searches — **only if legally/ToS-safe**; otherwise skip this in favor of manual + email-based intake
- [ ] Laravel `Concurrency` facade: parallelize multiple outbound checks (e.g. checking several sources at once) instead of sequential
- [ ] Weekly digest email (queued mailable, scheduled command) summarizing the week's activity and suggesting stale applications to chase
- [ ] Basic analytics: response rate by source, average time-in-stage per pipeline step

## Explicitly out of scope (for this project — may belong elsewhere)

- Multi-tenancy / multi-user — that's the SaaS project's job
- Broadcasting/WebSockets/real-time collaboration — not needed for a single-user tool, and I want to learn that specifically in the flagship project instead so it doesn't get diluted here
- Heavy ffmpeg/Process-management work — not relevant to this domain, save it for the media project if I ever build it
- Public marketing site / landing page — internal tool only

## Success criteria

- I actually use it daily during my job search instead of going back to a spreadsheet
- I can explain, in an interview, _why_ each Laravel feature (Jobs, Events, Scheduling, Notifications, S3, Redis) is used where it is — not just that it's present
- I have a documented Claude Code workflow (CLAUDE.md + skills + at least one working sub-agent + Boost integration) I can reuse as a template for future projects, including the Document Processing SaaS
