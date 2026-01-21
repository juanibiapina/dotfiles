# Instructions for opencode

## Command Execution (gob)

Always use `gob` to run commands.

### Running Commands

- `gob run <cmd>` - Run command, wait for completion, stream output
  - Equivalent to `gob add` + `gob await`
  - Best for: builds, tests, any command where you need the result
- `gob add <cmd>` - Starts command, returns job ID immediately
  - Supports flags directly: `gob add npm run --flag`
  - Supports quoted strings: `gob add "make test"`
- `gob await <job_id>` - Wait for job to finish, stream output, return exit code

### Sequential Execution

For commands that must complete before proceeding:

```
gob run make build
```

Or use add + await for more control:

```
gob add make build
gob await <job_id>
```

Use for: builds, installs, any command where you need the result.

### Parallel Execution

For independent commands, start all jobs first:

```
gob add npm run lint
gob add npm run typecheck
gob add npm test
```

Then collect results using either:

- `gob await <job_id>` - Wait for a specific job by ID
- `gob await-any` - Wait for whichever job finishes first

Example with await-any:

```
gob await-any   # Returns when first job finishes
gob await-any   # Returns when second job finishes
gob await-any   # Returns when third job finishes
```

Use for: linting + typechecking, running tests across packages, independent build steps.

### Job Monitoring

**Status:**
- `gob list` - List jobs with IDs and status

**Output:**
- `gob await <job_id>` - Wait for completion, stream output (preferred)

**Control:**
- `gob stop <job_id>` - Graceful stop
- `gob restart <job_id>` - Stop + start

### Examples

Good:
  gob run make test         # Run and wait for completion
  gob add npm run dev       # Start background server
  gob add make build && gob await <job_id>  # Add + await for more control

Bad:
  make test                 # Missing gob prefix
  npm run dev &             # Never use & - use gob add

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
