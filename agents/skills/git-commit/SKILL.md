---
name: git-commit
description: Reviews the working tree, writes a commit message that explains why, and creates the commit. Use when the user asks to commit, says "commit", or asks to commit and push.
---

# Git Commit

Commit only when the user asks.

Review staged, unstaged, and untracked changes plus recent commit style. Draft a concise message that explains why. Stage the right files, commit, then verify with `git status`.

## Guardrails

- Push or force push only when the user asks.
- Use non-interactive git commands; no terminal is attached to answer prompts.
- Run destructive commands (`reset --hard`, `clean`, `branch -D`) only on request.
- Leave out files that likely hold secrets, and skip empty commits.

## Amend rules

Use `--amend` only when all are true:
1. the user explicitly asked
2. the HEAD commit was created by you in this conversation
3. the commit has not been pushed
