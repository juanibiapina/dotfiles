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

## Archiving and labelling

There is no `archive` command. Archive by removing the `INBOX` label:

```bash
gmcli <email> labels <threadId> --remove INBOX,UNREAD
gmcli <email> labels <threadId> --add "House Search" --remove INBOX
```

Rules:

- **Pass multiple labels comma-separated in one flag.** `--remove` and `--add`
  each take a single string. Repeating a flag (`--remove INBOX --remove UNREAD`)
  silently keeps only the last value, prints `ok`, and leaves the email in the
  inbox.
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
