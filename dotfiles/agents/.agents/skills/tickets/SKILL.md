---
name: tickets
description: Manage per-project tickets stored as markdown in the notes vault. Use when the user mentions tickets, tasks, issues, backlog, tracking work items, adding/listing/completing tickets for a project. Triggers on "add ticket", "list tickets", "show ticket", "close ticket", "mark done", "project issues", or any ticket/task management request.
---

# Tickets

Per-project ticket tracking stored as markdown files in the notes vault.

## Setup

Requires `$NOTES_VAULT` and `$WORKSPACE` environment variables.

Files live at `$NOTES_VAULT/tickets/<owner>/<repo>.md` — one file per project.

## Commands

Run these from within a project directory (under `$WORKSPACE`) for auto-detection:

| Command | Description |
|---------|-------------|
| `dev tickets add <title> <description>` | Add a new ticket |
| `dev tickets list` | List all ticket titles |
| `dev tickets show <title>` | Show a ticket's full description |
| `dev tickets done <title>` | Remove a ticket (mark complete) |

## Examples

Add a ticket (use single quotes to avoid backtick/shell expansion):
```bash
dev tickets add 'Fix login timeout' 'Users are experiencing timeouts after 30s on the login page. Need to increase the timeout or fix the underlying slow query.'
```

List tickets:
```bash
dev tickets list
```

Show ticket details:
```bash
dev tickets show 'Fix login timeout'
```

Complete a ticket:
```bash
dev tickets done 'Fix login timeout'
```

## File Format

```markdown
# Tickets: owner/repo

## Ticket Title
Description text here. Can be multiple lines
with full details, acceptance criteria, links, etc.

## Another Ticket
Another description.
```

Each `##` heading is a ticket title. Everything below it until the next `##` is the description.

## Direct File Access

For bulk operations, the markdown file can be read or edited directly at:
```
$NOTES_VAULT/tickets/<owner>/<repo>.md
```
