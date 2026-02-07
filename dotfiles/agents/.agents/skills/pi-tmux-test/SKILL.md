---
name: pi-tmux-test
description: Test pi extensions interactively using tmux. Use when asked to test pi, verify pi extension behavior, launch pi in a tmux window, or check pi command output.
---

# Pi Tmux Testing

Test pi extensions by launching pi in a separate tmux window and inspecting output.

## Core Workflow

```bash
# 1. Create a tmux window in the current session
tmux new-window -t <session-name> -n test -c <working-dir>

# 2. Launch pi
tmux send-keys -t <session-name>:test 'pi' Enter

# 3. Wait for startup, then capture output
sleep 5
tmux capture-pane -t <session-name>:test -p

# 4. Send a command (e.g. /extension-settings)
tmux send-keys -t <session-name>:test '/extension-settings' Enter

# 5. Wait and read result
sleep 2
tmux capture-pane -t <session-name>:test -p

# 6. Exit pi
tmux send-keys -t <session-name>:test C-d
```

## Key Patterns

### Dismiss UI before exiting

Send `Escape` before `C-c`/`C-d` to close any open custom view (settings list, picker, etc.):

```bash
tmux send-keys -t <session>:test Escape
sleep 0.5
tmux send-keys -t <session>:test C-d
```

### Avoid project-level extensions

Use `-c /tmp` (or any dir without `.pi/`) to test only user-level packages:

```bash
tmux new-window -t <session> -n test -c /tmp
```

### Test a local extension build

Edit `~/.pi/agent/settings.json` and replace the npm package with an absolute path:

```json
"packages": [
  "/absolute/path/to/extension",
  "npm:other-extension@1.0.0"
]
```

Always restore settings.json after testing.

### Timing

Use `sleep` between `send-keys` and `capture-pane`. Pi startup needs ~5s; commands need ~2s.

## Settings Location

Pi settings: `~/.pi/agent/settings.json`
