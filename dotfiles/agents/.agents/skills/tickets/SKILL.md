---
name: tickets
description: Manage per-project tickets stored as markdown in the notes vault. Use when the user mentions tickets, tasks, issues, backlog, tracking work items, adding/listing/completing tickets for a project. Triggers on "add ticket", "list tickets", "show ticket", "close ticket", "mark done", "project issues", or any ticket/task management request.
---

# Tickets

Per-project ticket tracking stored as markdown files in the notes vault.

## Setup

Requires `$NOTES_VAULT` and `$WORKSPACE` environment variables.

Files live at `$NOTES_VAULT/tickets/<owner>/<repo>.md` — one file per project.

## States

Tickets progress through workflow states:

| State | Meaning |
|-------|---------|
| `new` | Just added, no description |
| `refined` | Problem is well-defined, has description |
| `planned` | Agent has analyzed code, has execution plan. Ready to implement |
| done | Removed from file |

## Commands

Run these from within a project directory (under `$WORKSPACE`) for auto-detection.

Commands that take `<title>` also accept a 3-character ticket ID.

| Command | Description |
|---------|-------------|
| `dev tickets add <title>` | Quick add as new (no description) |
| `dev tickets add <title> <description>` | Add with description as refined |
| `dev tickets list` | List all tickets with IDs and states |
| `dev tickets show <title>` | Show a ticket's full details |
| `dev tickets done <title>` | Remove a ticket (mark complete) |
| `dev tickets set-state <title> <state>` | Change ticket state |
| `dev tickets set-description <title> <description>` | Set/replace description |

## Examples

Add a quick ticket:
```bash
dev tickets add 'Fix login timeout'
```

Add with description:
```bash
dev tickets add 'Fix login timeout' 'Users are experiencing timeouts after 30s on the login page.'
```

List tickets:
```bash
dev tickets list
# aBc [new     ] Fix login timeout
# xYz [planned ] Refactor auth module
```

Show ticket details (by title or ID):
```bash
dev tickets show 'Fix login timeout'
dev tickets show aBc
```

Change state:
```bash
dev tickets set-state aBc refined
```

Set description:
```bash
dev tickets set-description aBc 'Detailed problem description here.'
```

Complete a ticket:
```bash
dev tickets done aBc
```

## File Format

```markdown
# owner/repo

## Ticket Title
---
id: aBc
state: new
---

## Another Ticket
---
id: xYz
state: refined
---
Description text here. Can be multiple lines
with full details, acceptance criteria, links, etc.

## Planned Ticket
---
id: Qr5
state: planned
---
### Problem
Description of the problem.

### Plan
1. Step one
2. Step two
```

Each `##` heading is a ticket title. A YAML front matter block (`---` delimited) follows with `id` (3-character base62) and `state`. Everything after the closing `---` until the next `##` is the description.

## Direct File Access

For bulk operations, the markdown file can be read or edited directly at:
```
$NOTES_VAULT/tickets/<owner>/<repo>.md
```
