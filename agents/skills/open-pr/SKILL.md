---
name: open-pr
description: >
  Drives work to a pull request, from branch and commit through
  opening the PR with reviewers.
  Use when opening a pull request, pushing changes for review, or when the user says "open PR", "create PR", or "send for review".
---

# Open Pull Request

Follow the workflow below, don't skip any steps. The goal is to drive the current work to a PR.

Load other pull request and commit related skills if available, they may add different requirements.

## Workflow

### 1. Assess state

Determine where things stand and pick the path to a pushed branch with an open PR.

Examples:
- On main with changes: sync, branch, commit, push, open PR.
- On a branch with changes: commit, push, open or update PR.
- On a branch, clean: push if needed, open PR or check existing.
- PR already exists: skip to shepherding.

In a GitButler workspace (current branch `gitbutler/workspace`), load the `but` skill. The session's work lives on a GitButler branch, and `gitbutler/workspace` itself is never pushed.

### 2. Sync with main

Before opening the PR, make sure the work sits on top of the latest remote main. In a GitButler workspace, run `but pull`. Otherwise, fetch and rebase before pushing when on a branch.

### 3. Branch and commit

Commit the relevant changes, following the `commit` skill. Reference the ticket in the PR body if one exists.

### 4. Push and open PR

Push the branch and open the PR, using the repository template if present. In a GitButler workspace, `but pr new <branch> -m "<title and body>"` pushes the branch and opens the PR; it keeps base branches right for stacked branches. If `but pr new` reports that no forge is authenticated, `but push <branch>` and `gh pr create --head <branch>` do the same for a single branch. Request reviewers with `gh pr edit --add-reviewer`, picked from CODEOWNERS, recent PR reviewers, or collaborators. If none can be determined, say so and ask. Do not open with no reviewers silently.

Write the PR title and description with the `documentation` skill.
