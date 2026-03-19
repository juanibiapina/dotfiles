---
name: pi-tmux-test
description: Test pi extensions interactively using tmux. Use when asked to test pi, verify pi extension behavior, launch pi in a tmux window, or check pi command output.
---

# Pi Tmux Testing

Test pi extensions by launching pi in a separate tmux window, sending commands, and capturing output with `tmux capture-pane -p`.

Target the window using `<session-name>:test` syntax for all tmux commands.

## Gotchas

- **Startup is slow**: Pi needs ~5 seconds to start. Wait before sending commands.
- **Commands need time too**: Wait ~2 seconds after sending a command before capturing output.
- **Dismiss UI before exiting**: Send `Escape` before `C-d` to close any open custom view (settings list, picker, etc.).
- **Avoid project-level extensions**: Use `-c /tmp` when creating the tmux window to test only user-level packages.
- **Testing a local extension build**: Edit `~/.pi/agent/settings.json` and replace the npm package with an absolute path. Always restore settings.json after testing.

## Settings Location

Pi settings: `~/.pi/agent/settings.json`
