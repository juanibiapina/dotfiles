---
name: gmcli
description: Gmail CLI for searching emails, reading threads, sending messages, managing drafts, and handling labels/attachments.
---

# Gmail CLI

Command-line interface for Gmail operations.

## Usage

Run `gmcli --help` for full command reference.

Common operations:
- `gmcli <email> search "<query>"` - Search emails using Gmail query syntax
- `gmcli <email> thread <threadId>` - Read a thread with all messages
- `gmcli <email> send --to <emails> --subject <s> --body <b>` - Send email
- `gmcli <email> labels list` - List all labels
- `gmcli <email> drafts list` - List drafts

## Wrong commands — do not use

These commands do not exist and will fail immediately:

| Wrong | Correct |
|-------|---------|
| `gmcli <email> archive <id>` | `gmcli <email> labels <id> --remove INBOX,UNREAD` |
| `gmcli <email> label <id> ...` | `gmcli <email> labels <id> ...` (plural) |
| `gmcli <email> read <id>` | `gmcli <email> thread <id>` |
| `gmcli <email> messages ...` | `gmcli <email> search "<query>"` |
| `gmcli <email> attachments <id>` | `gmcli <email> thread <id> --download` |
| `gmcli <email> email ...` | (no equivalent — use `thread`, `search`, or `send`) |

## Archiving and labelling

There is no `archive` command. Archive by removing the `INBOX` label:

```bash
# Correct — comma-separated in ONE flag:
gmcli <email> labels <threadId> --remove INBOX,UNREAD
gmcli <email> labels <threadId> --add "House Search" --remove INBOX,UNREAD

# WRONG — repeating the flag silently drops all but the last value:
# gmcli <email> labels <threadId> --remove INBOX --remove UNREAD  ← leaves email in inbox
```

> **Critical:** `--remove` and `--add` each accept a single comma-separated
> string. Repeating the flag (`--remove INBOX --remove UNREAD`) silently keeps
> only the last value, prints `ok`, and **leaves the email in the inbox**.
> Always use `--remove INBOX,UNREAD` (one flag, comma-separated).

Additional rules:

- **`labels` takes thread IDs, not message IDs.** A message ID from a
  multi-message thread returns `Requested entity was not found.` Get the thread
  ID from `search` or `thread` output.
- Never pipe these commands to `2>/dev/null` or chain them with `;`. Errors are
  the only signal that the archive did not happen. Check the printed
  `<threadId>: ok`.
- Verify with `gmcli <email> search "in:inbox"` when it matters.

## Troubleshooting

If you get an `invalid_grant` error, the OAuth token has expired. Re-authenticate by removing and re-adding the account:

```bash
gmcli accounts remove <email> && gmcli accounts add <email>
```
