---
name: todo
description: Manage per-directory todo lists via CLI. Use when the user mentions todos, tasks, adding items, checking off, marking done, listing what's left, or cleaning up completed items. Triggers on "add todo", "list todos", "check off", "mark done", "what's left", "clean up todos", or any todo/task request.
---

# Todo

Simple per-directory todo list backed by SQLite. Each directory has its own independent list.

## Commands

| Command | Description |
|---------|-------------|
| `todo` | List all items (shorthand for `todo list`) |
| `todo add <text>` | Add a new unchecked item |
| `todo list` | List all items with IDs and checked state |
| `todo check <id>` | Mark an item as done |
| `todo uncheck <id>` | Mark an item as not done |
| `todo edit <id> <text>` | Replace the text of an item |
| `todo clean` | Delete all checked items |

## Notes

- Items are either **checked** or **unchecked**. No other states.
- IDs are numeric, shown in `todo list` output.
- Do NOT use `todo tui`. Use only the CLI commands above.
