---
name: git-rebase
description: Use before performing a rebase or resolving rebase conflicts.
---

# Git Rebase

This environment has no interactive editor, so `git rebase --continue` hangs when git opens the commit-message editor. Always neutralize it: `GIT_EDITOR=true git rebase --continue`.
