---
name: workspace
description: Manage local GitHub projects organized by owner/repo in $WORKSPACE. Use when cloning external code, inspecting dependencies, cross-referencing projects, listing repositories, or reading/searching files from other projects. Triggers on "clone repo", "check that project", "look at the source", "compare with other repo", or any reference to external GitHub projects.
---

# Workspace

Local GitHub projects live at `$WORKSPACE/<owner>/<repo>`.

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

## Reading Files from Other Projects

Use absolute paths to read files from workspace projects:

```
$WORKSPACE/owner/repo/path/to/file.ts
```

Search across a project:
```bash
rg "pattern" "$WORKSPACE/owner/repo/src"
```
