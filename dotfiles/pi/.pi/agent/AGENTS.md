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
- `gob await <job_id>` - Wait for job to finish, stream output (use only when job is expected to finish. not for servers)
- `gob list` - List jobs with IDs and status
- `gob logs <job_id>` - View stdout and stderr (stdout→stdout, stderr→stderr)
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

### PROMPT.md

- Never commit PROMPT.md.

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

### Glean

Use `mcpli glean` for searching and asking questions about Contentful company knowledge.

## Code Values

Principles that guide all code you write and suggest. Follow these unless the project's own conventions say otherwise.

- **Fight complexity above all else.** Every design decision should reduce the complexity of the system. Complexity is anything that makes code hard to understand or modify. When in doubt, choose the path that makes the system simpler.

- **Write code for the reader.** Code is read far more than it is written. Optimize for the understanding of the person (or agent) who comes next. If something is not obvious, make it obvious — through better naming, simpler structure, or a brief comment explaining *why*, not *what*.

- **Testable code is better code.** Design for testability: inject dependencies, separate side effects from logic, avoid hidden state. Prefer real tests over mocks. Tests are proof that the code works and documentation of how it's meant to be used.

- **Make changes small and reversible.** Do one thing per change. Don't bundle unrelated improvements. Small changes are easier to review, test, revert, and understand. This applies to edits, commits, and refactors alike.

- **Match the codebase.** Adopt the project's existing patterns, naming, style, and structure. Consistency across a codebase is more valuable than any individual preference. Read before you write.

- **Prefer duplication over the wrong abstraction.** Don't abstract until a clear pattern has emerged from at least three concrete cases. A bad abstraction is worse than repeated code — it couples things that may need to diverge and hides complexity behind a misleading interface.

- **Handle errors explicitly.** Don't swallow errors, don't defer handling "for later", don't let failures pass silently. Crash early and loudly when something unexpected happens. Define errors out of existence where possible by making the default behavior do the right thing.

- **Delete code freely.** Less code means fewer bugs, less to read, less to maintain. Removing code is a valid and often superior improvement. Don't preserve dead code, unused abstractions, or speculative features.

- **Pull complexity downward.** When complexity is unavoidable, push it into well-encapsulated modules with simple interfaces rather than spreading it across callers. A module with a simple interface and complex internals is better than a simple module with a complex interface.

- **Think strategically, not tactically.** Don't just make things work — make them right. Invest a little more time in good design now to avoid compounding complexity later. Quick hacks accumulate into systems no one can maintain.
