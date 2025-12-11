<shell_commands>
ALWAYS use `gob add` to run shell commands through the Bash tool.

- `gob add -- <cmd>` - Starts command, returns job ID immediately
  - IMPORTANT: Always use `--` before the command
- `gob await <job_id>` - Wait for job to finish, stream output, return exit code
</shell_commands>

<sequential_execution>
For commands that must complete before proceeding:

```
gob add -- make build
```
Then immediately:
```
gob await <job_id>
```

Use for: builds, installs, any command where you need the result.
</sequential_execution>

<parallel_execution>
For independent commands, start all jobs first:

```
gob add -- npm run lint
gob add -- npm run typecheck
gob add -- npm test
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
</parallel_execution>

<job_monitoring>
**Status:**
- `gob list` - List jobs with IDs and status

**Output:**
- `gob await <job_id>` - Wait for completion, stream output (preferred)

**Control:**
- `gob stop <job_id>` - Graceful stop
- `gob stop --force <job_id>` - Force kill
- `gob restart <job_id>` - Stop + start
- `gob cleanup` - Remove stopped jobs
</job_monitoring>

<auto_background_handling>
The Bash tool automatically backgrounds commands that exceed 1 minute.

When this happens, IGNORE the shell ID returned by the Bash tool. Instead:

1. Use `gob await <job_id>` to wait for completion again
2. Do NOT use Crush's job_output or job_kill tools
</auto_background_handling>

<examples>
Good:
  gob add -- make test
  gob await V3x
  gob add -- npm run dev
  gob add -- timeout 30 make build

Bad:
  make test                 # Missing gob prefix
  gob run make test         # Don't use run, use add + await
  npm run dev &             # Never use & - use gob add
  gob add npm run --flag    # Missing -- before flags
</examples>

<jira>
Use the `jira` CLI for Jira operations.

**Common commands:**
- `jira issue view <KEY>` - View issue details
</jira>
