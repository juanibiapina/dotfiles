# Instructions for opencode

## Command Execution

Run most commands directly. Use `gob` only for servers, long-running commands, and builds.

### When to Use gob

Use `gob` for:
- **Servers**: `gob add npm run dev`
- **Long-running processes**: `gob add npm run watch`
- **Builds**: `gob run make build`
- **Parallel build steps**: Run multiple builds concurrently

Do NOT use `gob` for:
- Quick commands: `git status`, `ls`, `cat`
- CLI tools: `jira`, `kubectl`, `todoist`
- File operations: `mv`, `cp`, `rm`

### gob Commands

- `gob add <cmd>` - Start command in background, returns job ID
- `gob run <cmd>` - Run and wait for completion (equivalent to `gob add` + `gob await`)
- `gob await <job_id>` - Wait for job to finish, stream output
- `gob await-any` - Wait for whichever job finishes first
- `gob list` - List jobs with IDs and status
- `gob stop <job_id>` - Graceful stop
- `gob restart <job_id>` - Stop + start

### Examples

Servers and long-running:
```
gob add npm run dev       # Start dev server
gob add npm run watch     # Start file watcher
```

Builds:
```
gob run make build        # Run build, wait for completion
gob run npm run test      # Run tests, wait for completion
```

Parallel builds:
```
gob add npm run lint
gob add npm run typecheck
gob await-any             # Wait for first to finish
gob await-any             # Wait for second to finish
```

Regular commands (no gob):
```
git status
kubectl get pods
jira issue list
```

## Development Tools

### Workspace

Clone GitHub repositories to `$WORKSPACE/<owner>/<repo>`:

```sh
dev clone https://github.com/owner/repo
```

Use when you need to inspect external code, search dependencies, or cross-reference other projects.

### Notes Vault

Use when the user mentions notes, vault, knowledge base, or asks to find/create/read notes.

A directory of `.md` files at `$NOTES_VAULT`. This environment variable must be set.

**First interaction**: Read `$NOTES_VAULT/AGENTS.md` for vault-specific instructions.

**Notes:**
- The `.md` extension is optional in user requests (add it if missing)

### PLAN.md

- Never commit PLAN.md

## External Services

### Jira

Use the `jira` CLI for Jira operations.

### Kubernetes

Use `kubectl` for interacting with Kubernetes clusters.

### Todoist

Use the `todoist` CLI for interacting with Todoist.

### Gmail

Use `gmcli` for reading, searching, and composing e-mails.
Pattern: `gmcli <email> <command>`.
To read: search first (`gmcli <email> search "query"`) to get thread IDs, then `gmcli <email> thread <id>`.

### Google Calendar

Use `gccli` for calendars and events.
Pattern: `gccli <email> <command>`.
Use `primary` as calendar ID for the main calendar (e.g., `gccli <email> events primary`).

### Google Drive

Use `gdcli` for files in Google Drive.
Pattern: `gdcli <email> <command>`.
To download: search first (`gdcli <email> search "query"`) to get file IDs, then `gdcli <email> download <id>`.

### Grafana Logs

Use `logcli` for querying Grafana Loki logs.
Common commands:
- `logcli query '{app="myapp"}'` - Query logs with label selector
- `logcli query '{app="myapp"} |= "error"'` - Filter logs containing "error"
- `logcli labels` - List available labels
- `logcli series '{app="myapp"}'` - List log streams matching selector

### Slack

Use `slackcli` for reading messages and interacting with Slack.
Common commands:
- `slackcli conversations list` - List channels
- `slackcli conversations read <channel-id>` - Read channel history
- `slackcli conversations read <channel-id> --thread-ts <timestamp>` - Read a specific thread
- `slackcli messages send --recipient-id <channel-id> --message "text"` - Send a message

**Parsing Slack URLs:**
URL format: `https://workspace.slack.com/archives/<channel-id>/p<timestamp>`
Convert timestamp: remove `p` prefix, insert `.` before last 6 digits.
Example: `p1769171679125299` → `1769171679.125299`
