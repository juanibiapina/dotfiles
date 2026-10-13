---
description: Commit, push, and wait for CI on the pushed branch
---

Create a commit following the `commit` skill and push the branch to the remote. In a GitButler workspace, push the session's branch with `but push <branch>`. Then wait for the build on the pushed branch, normally GitHub Actions, until it finishes. If it fails, find the cause, fix it, commit, push, and watch again.

Keep watching within the same turn: a message without a tool call ends your turn, so a status summary that announces the next check leaves CI unwatched. Put status notes in the same message as your next tool call. Stop when the build passes, when a failure needs the user's decision, or when the user tells you to stop.
