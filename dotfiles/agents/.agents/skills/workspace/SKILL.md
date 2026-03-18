---
name: workspace
description: Manage local projects organized by owner/repo in $WORKSPACE. Use when cloning repos, inspecting dependencies, cross-referencing projects, listing local repositories, or reading/searching files from other local projects. Triggers on "clone repo", "check that project", "look at the source", "compare with other repo", any reference to other local projects, or any Git repository URL (e.g. "https://github.com/owner/repo", "git@github.com:owner/repo").
---

# Workspace

Local GitHub projects live at `$WORKSPACE/<owner>/<repo>`.

Personal projects are under the `juanibiapina` owner.

## Commands

| Command | Description |
|---------|-------------|
| `dev clone <url>` | Clone GitHub repo to workspace |
| `dev list` | List all projects as `owner/repo` |
| `dev open <project>` | Open project in tmux session |
| `dev start <url>` | Clone and open in one step |
| `dev worktree add [branch]` | Create worktree at `owner/repo.N`, open in tmux |
| `dev worktree list` | List worktrees with number and branch |
| `dev worktree remove [number]` | Remove worktree, kill tmux session, prompt to delete branch |

## Worktrees

Git worktrees live alongside the main repo as `owner/repo.1`, `owner/repo.2`, etc.

| | Path | Tmux session | Branch |
|---|---|---|---|
| Main repo | `owner/repo` | `repo` | (whatever) |
| Worktree 1 | `owner/repo.1` | `repo-1` | `worktree-1` (or user-specified) |
| Worktree 2 | `owner/repo.2` | `repo-2` | `feature-x` (or `worktree-2`) |

All worktree commands work from the main repo or any existing worktree. Existing commands (`dev list`, `dev open`, `dev tmux open`, `dev tmux switch`) work with worktrees unchanged.

## Examples

Clone a repository:
```bash
dev clone https://github.com/owner/repo
```

List projects to find one:
```bash
dev list | rg pattern
```

Create a worktree for a feature branch:
```bash
dev worktree add feature-x
```

## Project Context Discovery

The first time you access a workspace project in a conversation, check for an `AGENTS.md` at the project root. If it exists, read it before proceeding. Only do this once per project per conversation.

## Reading Files from Other Projects

Use absolute paths to read files from workspace projects:

```
$WORKSPACE/owner/repo/path/to/file.ts
```

Search across a project:
```bash
rg "pattern" "$WORKSPACE/owner/repo/src"
```
