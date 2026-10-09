---
name: open-pr
description: >
  Drives work to a merge-ready pull request, from branch and commit through
  opening the PR with reviewers to watching CI until it is approved and green.
  Use when opening a pull request, pushing changes for review, or when the user says "open PR", "create PR", "send for review", or "get this merged".
---

# Open Pull Request

Follow the workflow below, don't skip any steps. The goal is to drive the current work to a merge-ready PR. Opening the PR is not the finish line: the task completes only when the PR is approved with CI green, or the user tells you to stop.

Load other pull request and commit related skills if available, they may add different requirements.

## Workflow

### 1. Assess state

Determine where things stand and pick the path to a pushed branch with an open PR.

Examples:
- On main with changes: sync, branch, commit, push, open PR.
- On a branch with changes: commit, push, open or update PR.
- On a branch, clean: push if needed, open PR or check existing.
- PR already exists: skip to shepherding.

### 2. Sync with main

Before opening the PR, make sure the work sits on top of the latest remote main. Run a git fetch to make sure and rebase before pushing when on a branch.

### 3. Branch and commit

Name the branch after the ticket if one exists (e.g. `PROJ-123-short-description`) and reference the ticket in the PR body. Commit the relevant changes.

### 4. Push and open PR

Push the branch and open the PR, using the repository template if present. Request reviewers (from CODEOWNERS, recent PR reviewers, or collaborators). If none can be determined, say so and ask. Do not open with no reviewers silently.

Use a succint pull request description that describes in high level why we're doing this and the general strategy used. Don't include explanation of individual technical details unless they're surprising.

### 5. Monitor

Opening the PR is not done. Actively wait for CI and react until the PR is merge-ready:

- **CI pending**: wait for it. Use `gh pr checks --watch` to block until checks finish. Do not stop while checks are queued or running.
- **CI failure**: fix, push, watch again.
- **Review feedback**: understand, explain to the user and propose a solution. Wait for user confirmation.

Keep monitoring within the same turn. A message without a tool call ends your turn, so a status summary that announces the next check, or an offer to keep watching, leaves the PR unwatched. Put status notes in the same message as your next tool call.

Stop when merge-ready is yes (approved + CI green), when review feedback needs the user's decision, or when the user tells you to stop. Then post a status block: PR URL, CI state, reviewers requested, `merge-ready: yes/no`.
