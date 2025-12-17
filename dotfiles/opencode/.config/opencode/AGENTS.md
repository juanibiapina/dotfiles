# Instructions for opencode

## Running commands with `gob`

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

## Jira

Use the `jira` CLI for Jira operations.
