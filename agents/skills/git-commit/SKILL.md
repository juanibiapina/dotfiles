---
name: git-commit
description: Git commit workflow. Use when asked to commit changes or simply on the word `commit`.
---

# Git Commit

Only commit when the user explicitly asks. If unclear, ask first.

Review the current changes (staged, unstaged, untracked) and recent commit messages for style. Draft a concise commit message that explains *why*, not *what*. Stage relevant files and commit. Verify success with git status afterward.

If a pre-commit hook fails, fix the issue and create a new commit (never amend a failed commit).

Do not commit files that likely contain secrets (.env, credentials.json, etc.). Warn the user if they request it.

## Safety Rules

- NEVER update git config
- NEVER run destructive commands (push --force, hard reset) unless explicitly requested
- NEVER skip hooks (--no-verify) unless explicitly requested
- NEVER force push to main/master; warn if requested
- NEVER push unless explicitly asked
- NEVER use interactive flags (-i) since they require interactive input
- Do not create empty commits when there are no changes

## Amend Rules

Avoid amend. ONLY use --amend when ALL conditions are met:

1. User explicitly requested amend, OR commit succeeded but pre-commit hook auto-modified files
2. HEAD commit was created by you in this conversation
3. Commit has not been pushed to remote

If the commit failed or was rejected by a hook, never amend. Fix and create a new commit.
