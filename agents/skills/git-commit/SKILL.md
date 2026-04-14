---
name: git-commit
description: Git commit workflow. Use when asked to commit changes or on the word `commit`.
---

# Git Commit

Commit only when the user explicitly asks.

Review staged, unstaged, and untracked changes plus recent commit style. Draft a concise message that explains why. Stage the right files, commit, then verify with `git status`.

## Safety rules

- NEVER update git config
- NEVER run destructive commands unless explicitly requested
- NEVER skip hooks unless explicitly requested
- NEVER push unless explicitly asked
- NEVER force push to main or master
- NEVER use interactive git flags
- Do not create empty commits
- Do not commit likely secrets

## Amend rules

Use `--amend` only when all are true:
1. the user explicitly asked, or a successful commit auto-modified files via hooks
2. the HEAD commit was created by you in this conversation
3. the commit has not been pushed

If a hook fails, fix the issue and create a new commit.
