---
name: pi-sessions
description: Find, list, and analyse pi agent sessions. Use when the user asks about past pi conversations, session history, costs, what pi did, reviewing a session, or debugging agent behaviour.
---

# Pi Sessions

Pi stores conversation sessions as JSONL files. Each line is a JSON object with a `type` field.

## File Location

```
~/.pi/agent/sessions/--<path>--/<timestamp>_<uuid>.jsonl
```

Directory names encode the working directory with `/` replaced by `-`.

Example: sessions for `/Users/juan.ibiapina/workspace/juanibiapina/gmail-await` live in:
```
~/.pi/agent/sessions/--Users-juan.ibiapina-workspace-juanibiapina-gmail-await--/
```

## Finding Sessions

List all session directories (one per project):
```bash
ls ~/.pi/agent/sessions/
```

List sessions for a project (most recent last):
```bash
ls -t ~/.pi/agent/sessions/--<path>--/
```

Find sessions by date:
```bash
find ~/.pi/agent/sessions/ -name "2026-03-18*" -type f
```

Find sessions containing specific text:
```bash
grep -rl "search term" ~/.pi/agent/sessions/--<path>--/
```

Find the most recent session across all projects:
```bash
find ~/.pi/agent/sessions/ -name "*.jsonl" -type f -exec ls -t {} + | head -1
```

## JSONL Record Types

Each line has a `type` field. Records link via `id`/`parentId` forming a tree.

### `session` (header, first line)
```json
{"type":"session","version":3,"id":"uuid","timestamp":"...","cwd":"/path"}
```

### `message` (conversation turns)
Contains a `message` object with `role`:

- **`user`**: User input. `message.content` is string or content blocks.
- **`assistant`**: Model response. Has `message.content` (array of text/thinking/toolCall blocks), `message.model`, `message.provider`, `message.usage`, `message.stopReason`.
- **`toolResult`**: Tool output. Has `message.toolCallId`, `message.toolName`, `message.content`, `message.isError`.

### `model_change`
```json
{"type":"model_change","provider":"anthropic","modelId":"claude-opus-4-6"}
```

### `thinking_level_change`
```json
{"type":"thinking_level_change","thinkingLevel":"high"}
```

### `compaction`
Context was summarized to save tokens.
```json
{"type":"compaction","summary":"...","tokensBefore":50000}
```

### `branch_summary`
User switched branches in the conversation tree.

### `custom_message`
Extension-injected message (e.g., plan mode).

## Useful jq Queries

### Session overview (message count, roles, tools used)
```bash
cat SESSION.jsonl | jq -r 'select(.type == "message") | .message.role' | sort | uniq -c
```

### List all user messages
```bash
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "user") | .message.content | if type == "string" then . else [.[] | select(.type == "text") | .text] | join("\n") end'
```

### List assistant text responses (no thinking, no tool calls)
```bash
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "assistant") | [.message.content[] | select(.type == "text") | .text] | join("\n") | select(length > 0)'
```

### List all tool calls with names
```bash
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "assistant") | .message.content[] | select(.type == "toolCall") | .name' | sort | uniq -c | sort -rn
```

### List tool calls with arguments
```bash
cat SESSION.jsonl | jq 'select(.type == "message" and .message.role == "assistant") | .message.content[] | select(.type == "toolCall") | {name, arguments}'
```

### List tool errors
```bash
cat SESSION.jsonl | jq 'select(.type == "message" and .message.role == "toolResult" and .message.isError == true) | {toolName: .message.toolName, content: .message.content}'
```

### Total cost and token usage
```bash
cat SESSION.jsonl | jq -s '[.[] | select(.type == "message" and .message.role == "assistant") | .message.usage] | {turns: length, total_input: (map(.input) | add), total_output: (map(.output) | add), total_cache_read: (map(.cacheRead) | add), total_cache_write: (map(.cacheWrite) | add), total_cost: (map(.cost.total) | add)}'
```

### Models used
```bash
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "assistant") | .message.model' | sort | uniq -c
```

### Session duration (first to last timestamp)
```bash
cat SESSION.jsonl | jq -r '.timestamp' | sed -n '1p;$p'
```

### Conversation flow (role sequence with timestamps)
```bash
cat SESSION.jsonl | jq -r 'select(.type == "message") | "\(.timestamp) \(.message.role)" + (if .message.role == "assistant" then " [\(.message.stopReason)]" elif .message.role == "toolResult" then " [\(.message.toolName)]" else "" end)'
```

### Bash commands executed
```bash
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "assistant") | .message.content[] | select(.type == "toolCall" and .name == "bash") | .arguments.command'
```

### Files read
```bash
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "assistant") | .message.content[] | select(.type == "toolCall" and .name == "read") | .arguments.path'
```

### Files written or edited
```bash
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "assistant") | .message.content[] | select(.type == "toolCall" and (.name == "write" or .name == "edit")) | "\(.name) \(.arguments.path)"'
```
