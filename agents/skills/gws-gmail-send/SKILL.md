---
name: gws-gmail-send
description: "Gmail: Send an email or reply to an existing thread."
---

# gmail +send / +reply / +reply-all

> **PREREQUISITE:** Read `../gws-shared/SKILL.md` for auth, global flags, and security rules. If missing, run `gws generate-skills` to create it.

**Use `+reply` or `+reply-all` when replying to an existing email.** They handle `In-Reply-To`, `References`, and `threadId` automatically. Only use `+send` for brand-new emails with no prior thread.

## Replying to an existing email

```bash
gws gmail +reply --message-id MSG_ID --body TEXT
gws gmail +reply-all --message-id MSG_ID --body TEXT
```

### Flags (reply / reply-all)

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--message-id` | ✓ | — | Gmail message ID to reply to |
| `--body` | ✓ | — | Reply body (plain text, or HTML with --html) |
| `--to` | — | — | Extra To recipients |
| `--cc` | — | — | CC email address(es) |
| `--bcc` | — | — | BCC email address(es) |
| `--from` | — | — | Sender address (for send-as/alias) |
| `--attach` | — | — | Attach a file (repeatable) |
| `--html` | — | — | Treat --body as HTML |
| `--dry-run` | — | — | Show request without sending |
| `--draft` | — | — | Save as draft instead of sending |

### Examples

```bash
gws gmail +reply --message-id 18f1a2b3c4d --body 'Thanks, got it!'
gws gmail +reply --message-id 18f1a2b3c4d --body 'Looping in Carol' --cc carol@example.com
gws gmail +reply-all --message-id 18f1a2b3c4d --body 'Replying to everyone'
gws gmail +reply --message-id 18f1a2b3c4d --body 'Draft reply' --draft
```

---

## Sending a new email

```bash
gws gmail +send --to <EMAILS> --subject <SUBJECT> --body <TEXT>
```

### Flags

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--to` | ✓ | — | Recipient email address(es), comma-separated |
| `--subject` | ✓ | — | Email subject |
| `--body` | ✓ | — | Email body (plain text, or HTML with --html) |
| `--from` | — | — | Sender address (for send-as/alias; omit to use account default) |
| `--attach` | — | — | Attach a file (can be specified multiple times) |
| `--cc` | — | — | CC email address(es), comma-separated |
| `--bcc` | — | — | BCC email address(es), comma-separated |
| `--html` | — | — | Treat --body as HTML content (default is plain text) |
| `--dry-run` | — | — | Show the request that would be sent without executing it |
| `--draft` | — | — | Save as draft instead of sending |

### Examples

```bash
gws gmail +send --to alice@example.com --subject 'Hello' --body 'Hi Alice!'
gws gmail +send --to alice@example.com --subject 'Hello' --body 'Hi!' --cc bob@example.com
gws gmail +send --to alice@example.com --subject 'Hello' --body '<b>Bold</b> text' --html
gws gmail +send --to alice@example.com --subject 'Hello' --body 'Hi!' --from alias@example.com
gws gmail +send --to alice@example.com --subject 'Report' --body 'See attached' -a report.pdf
gws gmail +send --to alice@example.com --subject 'Files' --body 'Two files' -a a.pdf -a b.csv
gws gmail +send --to alice@example.com --subject 'Hello' --body 'Hi!' --draft
```

## Tips

- Handles RFC 5322 formatting, MIME encoding, and base64 automatically.
- Use --from to send from a configured send-as alias instead of your primary address.
- Use -a/--attach to add file attachments. Can be specified multiple times. Total size limit: 25MB.
- With --html, use fragment tags (<p>, <b>, <a>, <br>, etc.) — no <html>/<body> wrapper needed.
- Use --draft to save the message as a draft instead of sending it immediately.

> [!CAUTION]
> These are **write** commands — confirm with the user before executing.

## See Also

- [gws-shared](../gws-shared/SKILL.md) — Global flags and auth
- [gws-gmail](../gws-gmail/SKILL.md) — All send, read, and manage email commands
