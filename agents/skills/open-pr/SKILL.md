---
name: open-pr
description: >
  Use when opening a pull request, pushing changes for review, or when the user says "open PR", "create PR", "send for review", or "get this merged".
---

# Open PR

Drive the current work to a merge-ready PR. Opening the PR is not the finish line: the task completes only when the PR is approved with CI green, or the user tells you to stop.

Load project-local and global PR and commit related skills if available.

## Workflow

### 1. Assess state

Determine where things stand and pick the path to a pushed branch with an open PR.

Examples:
- On main with changes: sync, branch, commit, push, open PR.
- On a branch with changes: commit, push, open or update PR.
- On a branch, clean: push if needed, open PR or check existing.
- PR already exists: skip to shepherding.

### 2. Sync with main

Before opening the PR, make sure the work sits on top of the latest main. Pull before branching when on main; rebase before pushing when on a branch.

### 3. Branch and commit

Name the branch after the ticket if one exists (e.g. `PROJ-123-short-description`) and reference the ticket in the PR body. Commit the relevant changes.

### 4. Push and open PR

Push the branch and open the PR, using the repository template if present. Determine reviewers from CODEOWNERS, recent PR reviewers, or collaborators. Ask if unclear.

### 5. Shepherd to merge-ready

Monitor the PR and react:

- **CI failure**: fix, push, check again.
- **Review feedback**: understand, explain to the user and propose a solution. Wait for user confirmation.
- **Approved + CI green**: report ready to merge and stop.

Keep going until the PR is merge-ready or the user tells you to stop.
