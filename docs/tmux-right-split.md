# Tmux Right Split Pane System

## Overview

The tmux right split pane system provides a persistent, session-wide 30% right-side vertical split pane with full state preservation. It's designed for running long-lived processes like coding agents, REPLs, or monitoring tools that you want to access quickly from any window in your tmux session.

### Key Features

- **State Preservation**: History, running processes, and scroll buffer are preserved when hiding/showing
- **Session-Wide**: One pane per tmux session, accessible from any window
- **Smart Movement**: Pane automatically follows you to whichever window you're in
- **No Duplicates**: Impossible to create duplicate panes - the system always reuses the existing pane
- **Hidden Background**: Toggle off to hide the pane (continues running in background)
- **Seamless Integration**: Works with both tmux and neovim shortcuts

## Quick Start

### Most Common Usage

```bash
# From tmux
Ctrl-Space + t    # Toggle the right split pane

# From neovim
<Space>vc         # Open pane and run your coding agent
<Space>vb         # Send current file to the pane
<Space>vt         # Toggle the pane
```

### Basic Workflow

1. **Start your coding agent**: Press `<Space>vc` in neovim
2. **Send files to analyze**: Press `<Space>vb` to send current buffer
3. **Work in different windows**: The pane moves with you
4. **Hide when not needed**: Press `<Space>vt` to hide (keeps running)
5. **Show again**: Press `<Space>vt` from any window

## Commands Reference

All commands are under the `dev tmux right-split` namespace.

### `toggle`

Toggles the pane between visible and hidden states.

```bash
dev tmux right-split toggle
```

**Behavior:**
- If pane is visible in current window → Hide it (move to background)
- If pane is hidden or in another window → Show it in current window
- If pane doesn't exist → Create new 30% right-side split

**Shortcut:** `Ctrl-Space + t` (tmux), `<Space>vt` (neovim)

### `open`

Opens the pane in the current window, creating it if needed.

```bash
dev tmux right-split open
```

**Behavior:**
- If pane is visible in current window → Focus on it
- If pane is hidden or in another window → Move it to current window
- If pane doesn't exist → Create new 30% right-side split

**Note:** Unlike `toggle`, this never hides the pane - it always shows it.

### `close`

Permanently closes the pane, stopping all processes.

```bash
dev tmux right-split close
```

**Behavior:**
- Kills the pane whether it's visible or hidden
- Cleans up background window if pane was hidden
- Resets all tracking variables

**Warning:** This terminates any running processes in the pane. Use `toggle` to hide instead.

### `run <command>`

Opens the pane and runs a command in it.

```bash
dev tmux right-split run "npm test"
dev tmux right-split run claude
dev tmux right-split run '$CODING_AGENT'
```

**Behavior:**
- Opens pane if not visible (creates or moves from hidden/other window)
- Sends the command to the pane and executes it (presses Enter)
- Command runs in the pane's current directory

**Shortcut:** `<Space>vc` runs `dev tmux right-split run '$CODING_AGENT'`

### `send <text>`

Sends text to the pane without opening it.

```bash
dev tmux right-split send "ls -la"
dev tmux right-split send "@src/components/Button.tsx"
```

**Behavior:**
- Sends text to the pane if it exists (visible or hidden)
- Executes the text (presses Enter)
- Returns error if pane doesn't exist

**Shortcut:** `<Space>vb` sends current buffer's relative filepath

**Use case:** Send commands or files to a hidden coding agent without bringing it into view.

## Shortcuts Reference

### Tmux Shortcuts

| Shortcut | Command | Action |
|----------|---------|--------|
| `Ctrl-Space + t` | toggle | Toggle pane visibility |

### Neovim Shortcuts

| Shortcut | Command | Action |
|----------|---------|--------|
| `<Space>vb` | send current buffer | Send current file's relative path to pane |
| `<Space>vc` | run $CODING_AGENT | Open pane and run coding agent |
| `<Space>vt` | toggle | Toggle pane visibility |

**Location:** `dotfiles/nvim/.config/nvim/lua/shortcuts.lua`

## How It Works

### Session-Wide Pane Tracking

The system maintains **one pane per tmux session** using session-level tmux variables:

- `@right_split_pane` - Stores the pane ID (e.g., `%48`)
- `@right_split_window` - Stores the background window ID when pane is hidden (e.g., `@29`)

These variables are accessible from any window in the session, ensuring consistent tracking.

### State Preservation Mechanism

The system uses tmux's `break-pane` and `join-pane` commands for state preservation:

**Hiding (toggle off):**
```bash
tmux break-pane -d -s "$PANE_ID" -n "right-split-bg"
```
- Moves pane to its own background window
- `-d` keeps the pane detached (not visible)
- `-n "right-split-bg"` names the background window
- Pane continues running with all state intact

**Showing (toggle on):**
```bash
tmux join-pane -h -l 30% -s "$PANE_ID" -t "$CURRENT_PANE"
```
- Moves pane from wherever it is to current window
- `-h` horizontal split (side-by-side)
- `-l 30%` pane takes 30% of width
- Pane retains all history and running processes

### Smart Movement Across Windows

The detection logic checks three states in order:

1. **Pane in current window?** → Select it
2. **Pane exists anywhere in session?** → Move it here using `join-pane`
3. **Pane doesn't exist?** → Create new one

This prevents duplicate panes and ensures the pane follows you around.

### Hidden Background Window

When you toggle off:
- Pane moves to a special window named "right-split-bg"
- Window is invisible but pane keeps running
- On toggle on, pane moves back and background window is automatically cleaned up

## Architecture & Implementation

### File Structure

```
cli/libexec/tmux/right-split/
├── close    - Closes the pane permanently
├── open     - Opens/moves pane to current window
├── run      - Opens pane and runs a command
├── send     - Sends text to pane
└── toggle   - Toggles pane visibility
```

### Pane Detection Logic

Each command follows this pattern:

```bash
# 1. Check if pane is in current window
if pane in current window; then
  select it / use it

# 2. Check if pane exists anywhere in session
elif pane exists in session; then
  move it to current window (join-pane)
  clean up background window

# 3. Pane doesn't exist
else
  create new 30% right-side split
  store pane ID
fi
```

**Key command:**
```bash
tmux list-panes -s -t "$SESSION" -F "#{pane_id}"
```
The `-s` flag lists panes across the entire session, not just current window.

### Technical Details

**Pane Creation:**
```bash
tmux split-window -h -p 30 -PF "#{pane_id}"
```
- `-h` horizontal split (side-by-side)
- `-p 30` take 30% of window width
- `-P` print info about new window
- `-F "#{pane_id}"` output format (returns pane ID like `%48`)

**Pane Movement:**
```bash
tmux join-pane -h -l 30% -s "$PANE_ID" -t "$CURRENT_PANE"
```
- `-l 30%` set size to 30% of width (not `-p` which requires target specification)
- `-s` source pane to move
- `-t` target pane to join to

**Storage:**
```bash
tmux set -s @right_split_pane "$PANE_ID"        # Store pane ID
tmux show -sqv @right_split_pane                # Retrieve pane ID
tmux set -su @right_split_window                 # Clear window ID
```
- `-s` session-level option (accessible from any window)
- `-u` unset the option
- `-q` quiet (no error if option doesn't exist)
- `-v` show only the value

## Common Workflows

### Using with a Coding Agent

1. **Set your coding agent environment variable** (in your shell config):
   ```bash
   export CODING_AGENT="claude"
   # or
   export CODING_AGENT="aider --sonnet"
   ```

2. **Launch from neovim**:
   ```
   <Space>vc    # Opens pane and runs $CODING_AGENT
   ```

3. **Send files to analyze**:
   ```
   <Space>vb    # Sends current buffer's relative path
   ```

4. **Continue working**:
   - Agent keeps running even when you hide the pane
   - Switch windows freely - pane follows you when needed

### Moving Between Windows

```bash
# Window 1: Open pane
<Space>vt    # Creates pane in window 1

# Window 2: Access same pane
<Space>vt    # Moves pane from window 1 to window 2

# Window 3: Access again
<Space>vt    # Moves pane from window 2 to window 3
```

The pane seamlessly moves between windows without creating duplicates.

### Hiding and Showing

```bash
# Any window: Hide pane
<Space>vt    # Pane moves to background, keeps running

# Do some work in full-screen windows...

# Any window: Show pane
<Space>vt    # Pane returns to current window with full state
```

### Sending Files from Neovim

```bash
# Open file in neovim
vim src/components/Button.tsx

# Send to pane (even if pane is hidden)
<Space>vb    # Pane receives: src/components/Button.tsx

# Open another file
vim src/utils/helpers.js

# Send to pane
<Space>vb    # Pane receives: src/utils/helpers.js
```

The coding agent can process files in the background while you continue working.

## Troubleshooting

### Pane State Corrupted

If the pane gets into a bad state (duplicate panes, wrong tracking, etc.):

**Manual Reset:**
```bash
# 1. Close the pane(s)
dev tmux right-split close

# 2. Manually clear any remaining state
tmux set -su @right_split_pane
tmux set -su @right_split_window

# 3. Kill any lingering background windows
tmux list-windows | grep right-split-bg
tmux kill-window -t <window-id>

# 4. Create fresh pane
dev tmux right-split toggle
```

### Debug Current State

Check what's stored and where the pane is:

```bash
# Show stored values
echo "Pane ID: $(tmux show -sqv @right_split_pane)"
echo "Window ID: $(tmux show -sqv @right_split_window)"

# List all windows in session
tmux list-windows -F "#{window_id} #{window_index} #{window_name} - Panes: #{window_panes}"

# List all panes in session
tmux list-panes -s -F "#{pane_id} #{pane_index} #{window_name}"

# Check if stored pane exists
PANE_ID=$(tmux show -sqv @right_split_pane)
tmux list-panes -s -F "#{pane_id}" | grep -q "^$PANE_ID$" && \
  echo "Pane exists" || echo "Pane not found"
```

### Pane Not Following to New Window

This should not happen with the current implementation, but if it does:

1. Verify you're using the latest version of the scripts
2. Check that session-level storage is working:
   ```bash
   tmux show -s | grep right_split
   ```
3. Ensure the pane detection logic is checking session-wide:
   ```bash
   # This should be in the scripts:
   tmux list-panes -s -t "$SESSION" -F "#{pane_id}"
   ```

## Environment Variables

### `$CODING_AGENT`

Used by the `<Space>vc` neovim shortcut to determine which coding agent to run.

**Configuration:**

Add to your shell configuration (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
# Simple command
export CODING_AGENT="claude"

# Command with arguments
export CODING_AGENT="aider --sonnet"

# Command with full path
export CODING_AGENT="/usr/local/bin/my-agent"
```

**Note:** The variable is resolved in the tmux pane's shell, not when you press the shortcut. This allows you to set it differently in different tmux sessions.

**Testing:**
```bash
# In a terminal
echo $CODING_AGENT

# Should output your configured agent
```

## Examples

### Example 1: Full Coding Agent Workflow

```bash
# Terminal setup
export CODING_AGENT="claude"

# In neovim, editing src/api/users.ts
<Space>vc        # Opens pane, runs claude

# Send current file
<Space>vb        # Claude receives: src/api/users.ts

# Hide pane to work
<Space>vt        # Pane hidden, claude still running

# Switch to different file
:e src/api/posts.ts

# Send new file (pane still hidden)
<Space>vb        # Claude receives: src/api/posts.ts

# Show pane to see responses
<Space>vt        # Pane appears with all history intact
```

### Example 2: Multi-Window Development

```bash
# Window 1 (editor): Open pane
<Space>vt        # Pane appears in window 1

# Switch to window 2 (tests)
Ctrl-Space 2

# Access pane in window 2
<Space>vt        # Pane moves to window 2

# Run tests in pane
dev tmux right-split run "npm test"

# Switch to window 3 (git)
Ctrl-Space 3

# Hide pane completely
<Space>vt        # Pane hidden, tests keep running

# Check test results later from any window
<Space>vt        # Pane appears with test output
```

### Example 3: Background File Processing

```bash
# Open coding agent in pane
<Space>vc

# Hide pane
<Space>vt

# Send multiple files from different windows
# Window 1:
<Space>vb        # Send file 1

# Window 2:
<Space>vb        # Send file 2

# Window 3:
<Space>vb        # Send file 3

# All files sent to background agent
# Show pane to see all responses
<Space>vt
```

## Version History

- **v1.0** - Initial implementation with state preservation and session-wide tracking
  - Commands: toggle, open, close, run, send
  - Shortcuts: tmux (Ctrl-Space+t), neovim (<Space>vt, <Space>vc, <Space>vb)
  - Features: Smart movement, no duplicates, hidden background window
  - Bug fix: Session-wide pane detection prevents duplicates across windows
