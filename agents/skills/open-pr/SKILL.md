---
name: open-pr
description: >
  Use when opening a pull request, pushing changes for review, or when the user says "open PR", "create PR", "send for review", or "get this merged".
---

# Open PR

The goal is to create a PR from a branch (rebased with latest main) including all relevant changes and get it ready to merge.

Load project-local and global PR and commit related skills if available.

## Starting point

Determine the best course of action given the current state.

Examples:
- On main with changes: stash, pull, create branch, apply, commit, push, open PR.
- On a branch with changes: commit, push, open or update PR.
- On a branch, clean: push if needed, open PR or check existing.
- PR already exists: skip to shepherding.

## Branch and commit

Name the branch after the ticket if one exists (e.g. `PROJ-123-short-description`). Reference the ticket in the PR body.

## Creating the PR

Determine reviewers from CODEOWNERS, recent PR reviewers, or collaborators. Ask if unclear.

## Shepherding

Check the PR every few minutes and react:

- **CI failure**: fix, push, check again.
- **Review feedback**: address, push, check again.
- **Approved + CI green**: report ready to merge. Stop.
