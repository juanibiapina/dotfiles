# Subagent

Delegate a task to a subagent that runs in an isolated context window.

Based on pi's official subagent example, since adapted for this repo: trimmed to
single-task delegation only (no chain or parallel modes) and stripped to a pure
primitive — no agent names, no preset prompts, no tool filtering. The subagent is
a fresh `pi` process whose behavior comes entirely from the task.

## Features

- **Isolated context**: Each subagent runs in a separate `pi` process
- **Streaming output**: See tool calls and progress as they happen
- **Markdown rendering**: Final output rendered with proper formatting (expanded view)
- **Usage tracking**: Shows turns, tokens, cost, and context usage
- **Abort support**: Ctrl+C propagates to kill subagent processes

## Structure

```
subagent/
├── README.md            # This file
└── index.ts             # The extension (entry point)
```

## Usage

```
Use a subagent to load the plan skill and produce a plan for X
```

## Tool Invocation

`{ task, model?, cwd? }` — delegate one task.
- `task`: what the subagent should do. Reference a skill to drive its behavior
  (e.g. "Load the plan skill and produce a plan for X").
- `model`: optional model override for this call; omit to inherit the default.
- `cwd`: optional working directory for the subagent process.

The subagent runs with full tools and no preset system prompt. Any constraints
(e.g. "make no source-code changes") must come from the task or the skill it
loads.

## Output Display

**Collapsed view** (default):
- Status icon (✓/✗/⏳)
- Last 5-10 items (tool calls and text)
- Usage stats: `3 turns ↑input ↓output RcacheRead WcacheWrite $cost ctx:contextTokens model`

**Expanded view** (Ctrl+O):
- Full task text
- All tool calls with formatted arguments
- Final output rendered as Markdown
- Usage stats

**Tool call formatting** (mimics built-in tools):
- `$ command` for bash
- `read ~/path:1-10` for read
- `grep /pattern/ in ~/path` for grep
- etc.

## Error Handling

- **Exit code != 0**: Tool returns error with stderr/output
- **stopReason "error"**: LLM error propagated with error message
- **stopReason "aborted"**: User abort (Ctrl+C) kills subprocess, throws error

## Limitations

- Output truncated to last 10 items in collapsed view (expand to see all)
