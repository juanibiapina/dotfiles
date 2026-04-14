---
name: pi-sessions
description: Find, list, and analyse pi agent sessions. Use when the user asks about past pi conversations, session history, costs, what pi did, reviewing a session, or debugging agent behaviour.
---

# Pi Sessions

Pi stores sessions as JSONL files under `~/.pi/agent/sessions/`.

## Path format

```text
~/.pi/agent/sessions/--<path>--/<timestamp>_<uuid>.jsonl
```

Project directories encode the working directory with `/` replaced by `-`.

## Common commands

```bash
ls ~/.pi/agent/sessions/
ls -t ~/.pi/agent/sessions/--<path>--/
find ~/.pi/agent/sessions/ -name "2026-03-18*" -type f
grep -rl "search term" ~/.pi/agent/sessions/--<path>--/
find ~/.pi/agent/sessions/ -name "*.jsonl" -type f -exec ls -t {} + | head -1
```

## Record types

- `session` - session header
- `message` - user, assistant, or toolResult turn
- `model_change`
- `thinking_level_change`
- `compaction`
- `branch_summary`
- `custom_message`

## Useful queries

```bash
# user messages
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "user") | .message.content | if type == "string" then . else [.[] | select(.type == "text") | .text] | join("\n") end'

# assistant text only
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "assistant") | [.message.content[] | select(.type == "text") | .text] | join("\n") | select(length > 0)'

# tool calls
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "assistant") | .message.content[] | select(.type == "toolCall") | .name' | sort | uniq -c | sort -rn

# bash commands
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "assistant") | .message.content[] | select(.type == "toolCall" and .name == "bash") | .arguments.command'

# files read
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "assistant") | .message.content[] | select(.type == "toolCall" and .name == "read") | .arguments.path'

# files written or edited
cat SESSION.jsonl | jq -r 'select(.type == "message" and .message.role == "assistant") | .message.content[] | select(.type == "toolCall" and (.name == "write" or .name == "edit")) | "\(.name) \(.arguments.path)"'
```
