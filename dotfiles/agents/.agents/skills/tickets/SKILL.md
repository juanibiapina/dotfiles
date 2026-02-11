---
name: tickets
description: Manage per-project tickets stored as markdown in the local directory. Use when the user mentions tickets, tasks, issues, backlog, tracking work items, adding/listing/completing tickets for a project. Triggers on "add ticket", "list tickets", "show ticket", "close ticket", "mark done", "project issues", or any ticket/task management request.
---

# Tickets

Per-project ticket tracking.

## States

| State | Meaning |
|-------|---------|
| `new` | Just added, no description |
| `refined` | Problem is well-defined, has description |
| `planned` | Agent has analyzed code, has execution plan |
| done | Removed from file |

## Commands

All commands accept a ticket title or 3-character ticket ID. Use `<<'EOF' ... EOF` for multi-line or rich descriptions with backticks/code blocks.

| Command | Description |
|---------|-------------|
| `todo add <title> [description]` | Add ticket (`new` without description, `refined` with) |
| `todo list` | List all tickets with IDs and states |
| `todo show <title>` | Show full ticket details |
| `todo done <title>` | Remove a ticket (mark complete) |
| `todo set-state <title> <state>` | Change ticket state |
| `todo set-description <title> <description>` | Set/replace description |
| `todo move-up <title>` | Move ticket up in the list |
| `todo move-down <title>` | Move ticket down in the list |
| `todo tui` | Interactive full-screen TUI |
| `todo quick-add` | Interactive prompt to add a ticket |


