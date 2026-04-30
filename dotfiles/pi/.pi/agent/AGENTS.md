# Instructions for pi

## Communication

Be brief.

## Command Execution

Run most commands directly. Use `gob` for servers, long-running commands, and builds only.

### When to Use gob

Use `gob` for:
- **Servers**: `gob add npm run dev`
- **Long-running processes**: `gob add npm run watch`
- **Builds**: `gob run make build`
- **Parallel build steps**: run multiple builds concurrently

Do NOT use `gob` for:
- Quick commands: `git status`, `ls`, `cat`
- CLI tools: `jira`, `kubectl`, `todoist`
- File operations: `mv`, `cp`, `rm`

### gob Commands

- `gob add <cmd>` - Start in background, returns job ID
- `gob run <cmd>` - Run and wait for completion (`gob add` + `gob await`)
- `gob await <job_id>` - Wait for job to finish, stream output (not for servers)
- `gob list` - List jobs with IDs and status
- `gob logs <job_id>` - View stdout and stderr
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
```

Regular commands (no gob):
```
git status
kubectl get pods
jira issue list
```

## Development Tools

### Git

- Commit only when explicitly asked.
- Amend only when explicitly asked.

## External Services

### Jira

Use the `jira` CLI.

### Kubernetes

Use `kubectl`.

### Todoist

Use the `todoist` CLI.

### Grafana Logs

Use `logcli` for Grafana Loki logs.
- `logcli query '{app="myapp"}'` - Query by label
- `logcli query '{app="myapp"} |= "error"'` - Filter by content
- `logcli labels` - List labels
- `logcli series '{app="myapp"}'` - List matching streams

### Slack

Use `slackcli` for Slack.
- `slackcli conversations list` - List channels
- `slackcli conversations read <channel-id>` - Read channel history
- `slackcli conversations read <channel-id> --thread-ts <timestamp>` - Read a thread
- `slackcli messages send --recipient-id <channel-id> --message "text"` - Send a message

**Parsing Slack URLs:**
Format: `https://workspace.slack.com/archives/<channel-id>/p<timestamp>`
Convert timestamp: remove `p` prefix, insert `.` before last 6 digits.
Example: `p1769171679125299` -> `1769171679.125299`

### Confluence

Use the `confluence` CLI.
- `confluence spaces` - List spaces
- `confluence search "query"` - Search pages
- `confluence read <pageId>` - Read page (`--format markdown` for markdown)
- `confluence info <pageId>` - Page metadata
- `confluence children <pageId>` - List child pages
- `confluence find "title"` - Find by title (`--space SPACEKEY` to filter)

**Parsing Confluence URLs:**
Format: `https://domain.atlassian.net/wiki/spaces/SPACE/pages/<pageId>/Page+Title`
Extract the numeric `pageId` from the URL.

### Glean

Use `mcpli glean` for searching Contentful company knowledge.
