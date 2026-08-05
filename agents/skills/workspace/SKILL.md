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

## Examples

Clone a repository:
```bash
dev clone https://github.com/owner/repo
```

List projects to find one:
```bash
dev list | rg pattern
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

Before searching or auditing a local repo, bring it current: `git fetch`, check ahead/behind against the upstream default branch, and fast-forward if behind. This matters most before concluding something is absent (a usage, dependency, config, or pattern): a `rg`/`fd` miss on a stale checkout is a false negative, not evidence of absence.
