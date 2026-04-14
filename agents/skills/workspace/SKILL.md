---
name: workspace
description: Manage local projects organized by owner/repo in $WORKSPACE. Use when cloning repos, inspecting dependencies, cross-referencing projects, listing local repositories, or reading/searching files from other local projects. Triggers on "clone repo", "check that project", "look at the source", "compare with other repo", any reference to other local projects, or any Git repository URL (e.g. "https://github.com/owner/repo", "git@github.com:owner/repo").
---

# Workspace

Local GitHub projects live at `$WORKSPACE/<owner>/<repo>`.

Personal projects are under `juanibiapina`.

## Commands

```bash
dev clone <url>
dev list
dev open <project>
dev start <url>
dev worktree add [branch]
dev worktree list
dev worktree remove [number]
```

## Notes

- Worktrees live beside the main repo as `owner/repo.N`.
- On first access to another workspace project in a conversation, read its `AGENTS.md` if present.
- Use absolute paths when reading files from other projects.
- Search with `rg "pattern" "$WORKSPACE/owner/repo/src"`.
