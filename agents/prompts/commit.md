---
description: Commit, push, and wait for CI on the pushed branch
---

Create a git commit following the `git-commit` skill and push to the remote branch. Then wait for the build on the pushed branch, normally GitHub Actions, until it finishes. If it fails, find the cause, fix it, commit, push, and watch again.

Keep watching within the same turn: a message without a tool call ends your turn, so a status summary that announces the next check leaves CI unwatched. Put status notes in the same message as your next tool call. Stop when the build passes, when a failure needs the user's decision, or when the user tells you to stop.
