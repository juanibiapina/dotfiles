# Instructions for pi

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

### PLAN.md

- Never commit PLAN.md

### Git

- Commit only when explicitly asked
- Amend commits only when explicitly asked

## External Services

### Jira

Use the `jira` CLI for Jira operations.

### Kubernetes

Use `kubectl` for interacting with Kubernetes clusters.

### Todoist

Use the `todoist` CLI for interacting with Todoist.

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

### Confluence

Use `confluence` CLI for reading and managing Confluence pages.
Common commands:
- `confluence spaces` - List all spaces
- `confluence search "query"` - Search for pages
- `confluence read <pageId>` - Read page content (use `--format markdown` for markdown)
- `confluence info <pageId>` - Get page metadata
- `confluence children <pageId>` - List child pages
- `confluence find "title"` - Find page by title (use `--space SPACEKEY` to filter)

**Parsing Confluence URLs:**
URL format: `https://domain.atlassian.net/wiki/spaces/SPACE/pages/<pageId>/Page+Title`
Extract the numeric `pageId` from the URL to use with commands.
