---
description: Update docs/ to reflect the working-tree changes, then stage and commit everything
argument-hint: "[optional context, e.g. 'this closes the auth milestone']"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git ls-files:*), Read, Edit, Write, Glob, Grep
---

## Current state

- Today's date: !`date +%Y-%m-%d`
- Branch: !`git branch --show-current`
- Status: !`git status --porcelain --untracked-files=all`
- Diff stat: !`git diff HEAD --stat`
- Recent commits (for message style): !`git log --oneline -8`

Extra context from the user: $ARGUMENTS

## Your task

Update the three files in `docs/` so they describe reality after these changes, then commit.

**If the status above is empty, stop and say there is nothing to commit.** Never create an empty commit.

### 1. Understand the changes

Run `git diff HEAD` for the tracked detail, and `Read` any untracked files — they will not appear in the diff. Work out what actually changed in behaviour or structure, not just which lines moved.

Ignore pure noise: lockfile churn, formatting-only passes, and dependency bumps that change nothing observable. If the entire changeset is noise, skip the doc edits and just commit.

### 2. `docs/changelog.md`

Add entries under `## [Unreleased]`, grouped as `Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security`. Create a group heading only if that group has an entry.

- Describe **user- or developer-visible change**, not commits. "Applications can be filtered by status" — not "added `status` param to `ApplicationController@index`".
- One entry per change, not per file.
- Before adding, read the existing entries. If one already covers this area, **amend it** rather than appending a near-duplicate.
- Internal refactors with no visible effect do not belong here.

### 3. `docs/architecture.md` — only if structure actually changed

Most changes should **not** touch this file. Edit it only when one of these is true:

- A new top-level directory, service, or runtime dependency appears (or disappears)
- A documented data-flow path changes — the read, write, scheduled, or upload path
- The API layering or a stated boundary changes
- Something the file marks **planned** now exists — in which case remove the "planned" marker and describe what was built
- The file now says something that is **false**

Adding a model, controller, or component that follows a pattern the file already describes is **not** structural. Leave it alone.

### 4. `docs/project_status.md`

- Set `**Last updated:**` to today's date from above.
- Move finished items from "Remaining in this phase" into "Accomplished" as `- [x]`.
- Add newly-discovered work to "Remaining" if the changes revealed any.
- If every item in a phase is done, update that row in the Milestones table and advance `**Current phase:**`.
- Rewrite "What's next" if the next step has genuinely changed. Do not churn it otherwise.
- Update "Known gaps and risks" — remove resolved ones, add real new ones.

Only tick something off if the diff shows it is actually done and verified. An unticked item is recoverable; a wrongly-ticked one gets believed.

### 5. Commit

Stage everything with `git add -A`, then verify nothing sensitive is staged:

```
git diff --cached --name-only | grep -E '(^|/)\.env$|(^|/)(vendor|node_modules)/'
```

If that matches anything, stop and report it instead of committing.

Write the message in this repo's established style — a short imperative subject, a blank line, then a body explaining *why* the change was made, not restating the diff:

```
Short imperative subject under ~65 chars

Why this change exists and what it enables or fixes. Wrap at 72
columns. Mention anything surprising a future reader would trip on.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

**Do not push.** Pushing stays a separate, explicit decision.

### 6. Report back

State concisely: which docs you changed and why, which you deliberately left alone, and the commit subject. If you chose not to touch `architecture.md`, say so — that is a real decision, not an omission.
