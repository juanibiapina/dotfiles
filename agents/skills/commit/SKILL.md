---
name: commit
description: Reviews the working tree, writes a commit message that explains why, and creates the commit. Use when the user asks to commit, says "commit", or asks to commit and push.
---

# Commit

Commit only when the user asks.

Review the uncommitted changes and recent commit style. Draft a concise message that explains why. Commit only the changes that belong to the request.

## GitButler workspace

Local projects (repositories under `$WORKSPACE`) use GitButler. If one is not on the `gitbutler/workspace` branch yet, run `but setup` first and tell the user the repository was converted. Setup keeps the current branch and uncommitted changes.

When the current branch is `gitbutler/workspace`, load the `but` skill and commit with `but`. Commit on this session's GitButler branch, creating one if needed, and leave other sessions' changes uncommitted. Split unrelated changes by hunk.

Amend an unpublished local commit when a small fix clearly belongs with that commit's intent. Ask before rewriting pushed, reviewed, or shared history.

## Guardrails

- Push or force push only when the user asks.
- Use non-interactive commands; no terminal is attached to answer prompts.
- Run destructive commands (`reset --hard`, `clean`, `branch -D`, `but discard`) only on request.
- Leave out files that likely hold secrets, and skip empty commits.
