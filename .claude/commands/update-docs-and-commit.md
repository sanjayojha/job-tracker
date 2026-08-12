---
description: Update docs/ and CLAUDE.md to reflect the working-tree changes, then commit and push
argument-hint: "[optional context, e.g. 'this closes the auth milestone']"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git ls-files:*), Bash(git branch:*), Bash(git checkout:*), Bash(git switch:*), Bash(gh pr:*), Bash(gh run:*), Read, Edit, Write, Glob, Grep
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

### 5. `CLAUDE.md` — only if a stated fact is now wrong

This file is injected into every session and believed without being re-read, so a stale line there is more damaging than anywhere else. It is also the easiest file to bloat. Edit it **only** when:

- A **Trap** was resolved and should be deleted — e.g. `routes/api.php` now exists, or Pest replaced PHPUnit
- A **new trap** appeared: something that looks reasonable but is wrong in this repo
- An **open decision closed** — component library, routing, state management, API client
- A **command changed**, or a documented path/URL moved
- A convention or constraint was added, dropped, or reversed

Do **not** add feature descriptions, progress, or history — those belong in the other three files. When something is resolved, **delete the line** rather than annotating it as done; this file describes the present, not the journey.

If nothing in it became false, leave it completely alone. That is the normal case.

### 6. Pick the branch — before committing

If the branch above is **not** `main`, stay on it.

If it **is** `main`, decide which kind of change this is:

- **Code** — anything under `backend/` or `frontend/`, or a change to CI or the DDEV config. Create a branch first: `git checkout -b feature/short-description` (or `fix/...`). CLAUDE.md forbids committing feature work directly to `main`, and doing it here would silently break that rule.
- **Docs only** — `docs/`, `README.md`, `CLAUDE.md`, `.claude/`, and nothing else. Commit straight to `main`. A branch and PR for a changelog line is friction with no payoff, and there is nothing for CI to catch.

Branch before the commit, not after. Moving a commit off `main` afterwards is recoverable but pointless work.

### 7. Commit

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

### 8. Push, and open a PR if this is on a branch

A commit that only exists locally is unbacked-up work with no upside, so always push.

**On `main`** (docs-only changes): `git push`, then watch the run it triggers and report the result:

```
SHA=$(git rev-parse HEAD)
until RUN=$(gh run list --commit "$SHA" --json databaseId --jq '.[0].databaseId') && [ -n "$RUN" ]; do sleep 3; done
gh run watch "$RUN" --exit-status --compact --interval 10 > /dev/null 2>&1
gh run view "$RUN" | head -7
```

Two things make this trustworthy:

- **Look the run up by commit SHA, and wait for it to appear.** `gh run list --limit 1` is a trap: GitHub takes a few seconds to register a new run, so it returns the *previous* commit's run and reports that success as yours. `--limit 1` without a filter is worse still — it takes the newest run repo-wide, which may belong to a branch PR.
- **`--exit-status` makes a red run fail the command** rather than something you have to remember to parse. `gh run view` then prints the per-job breakdown for the report. Note the header does not include the commit, so it cannot itself confirm you watched the right run — that is what the SHA lookup is for.

Never report a push as finished without its CI result. "Pushed" is not "green".

**On a branch:** `git push -u origin <branch>`, then **open a PR immediately** — do not wait for the work to feel finished:

```
gh pr create --base main --head <branch> --title "<commit subject>" --body "..."
```

This matters mechanically, not ceremonially: `.github/workflows/ci.yml` fires on `push` to `main` and on `pull_request`. A push to a feature branch with no PR open **matches neither trigger and runs nothing**. Until the PR exists, the branch is untested by CI.

Body: why the change exists and any decision a reader should push back on. End it with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Then wait for the checks and report the result:

```
gh pr checks <number> --watch --interval 10
```

If they fail, read the actual log with `gh run view --log-failed` and diagnose it — do not guess and re-push.

**Do not merge.** Report the PR URL and check status, and let the user decide. If they have already said to merge in `$ARGUMENTS`, use `gh pr merge <n> --squash --delete-branch`, then `git checkout main && git pull` — **and watch the run the merge triggers on `main`, using the command above.**

A green PR does not mean `main` is green. The squash commit is a new commit, and if `main` moved while the PR was open its tree is not the tree CI tested. The post-merge run on `main` is the one that says the trunk still works, so merging is not finished until it passes.

**Never force-push.** If a push is rejected, stop and report it rather than forcing or rebasing unasked.

### 9. Report back

State concisely: which files you changed and why, which you deliberately left alone, the commit subject, and — if there is one — the PR URL with its CI status. If you chose not to touch `architecture.md` or `CLAUDE.md`, say so — that is a real decision, not an omission.
