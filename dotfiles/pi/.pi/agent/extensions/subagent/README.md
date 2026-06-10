# Subagent

Delegate a task to a specialized agent that runs in an isolated context window.

Based on pi's official subagent example, since adapted for this repo: trimmed to
single-agent delegation only (no chain or parallel modes) and pared down to one
agent definition.

## Features

- **Isolated context**: Each subagent runs in a separate `pi` process
- **Streaming output**: See tool calls and progress as they happen
- **Markdown rendering**: Final output rendered with proper formatting (expanded view)
- **Usage tracking**: Shows turns, tokens, cost, and context usage per agent
- **Abort support**: Ctrl+C propagates to kill subagent processes

## Structure

```
subagent/
├── README.md            # This file
├── index.ts             # The extension (entry point)
└── agents.ts            # Agent discovery logic
```

Agent definitions live separately under `dotfiles/pi/.pi/agent/agents/`.

## Usage

```
Use planner to draft an implementation plan for X
```

## Tool Invocation

`{ agent, task }` — delegate one task to one agent.

## Output Display

**Collapsed view** (default):
- Status icon (✓/✗/⏳) and agent name
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

## Agent Definitions

Agents are markdown files with YAML frontmatter:

```markdown
---
name: my-agent
description: What this agent does
tools: read, grep, find, ls
model: claude-haiku-4-5
---

System prompt for the agent goes here.
```

**Location:** `~/.pi/agent/agents/*.md`

Omit the `model` line to make the child inherit the parent's default model.

## Agents

| Agent | Purpose | Tools |
|-------|---------|-------|
| `planner` | Implementation plans | read, grep, find, ls |

## Error Handling

- **Exit code != 0**: Tool returns error with stderr/output
- **stopReason "error"**: LLM error propagated with error message
- **stopReason "aborted"**: User abort (Ctrl+C) kills subprocess, throws error

## Limitations

- Output truncated to last 10 items in collapsed view (expand to see all)
- Agents discovered fresh on each invocation (allows editing mid-session)
