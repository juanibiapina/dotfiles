---
name: pi-sessions
description: Find, list, and analyse pi agent sessions with DuckDB. Use when the user asks about past pi conversations, session history, costs, what pi did, reviewing a session, summarizing or extracting conversation text, or debugging agent behaviour.
---

# Pi Sessions

Pi stores conversation sessions as JSONL event streams. Each line is a JSON object with a `type` field. Query them with DuckDB.

Treat **conversation inspection** (what happened in one session) and **cross-session analytics** (counts, trends, costs) as separate branches. Start with the narrowest data that answers the request.

Scripts and reference queries live next to this file. Resolve paths relative to this skill directory.

## File Location

```
~/.pi/agent/sessions/--<path>--/<timestamp>_<uuid>.jsonl
```

Directory names encode the working directory with `/` replaced by `-`.

Example: sessions for `/Users/juan.ibiapina/workspace/juanibiapina/gmail-await` live in:
```
~/.pi/agent/sessions/--Users-juan.ibiapina-workspace-juanibiapina-gmail-await--/
```

Filenames look like `2026-04-30T14-04-00-598Z_<uuid>.jsonl`.

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
fd '^2026-03-18' ~/.pi/agent/sessions/
```

Find sessions containing specific text:
```bash
rg -l "search term" ~/.pi/agent/sessions/--<path>--/
```

Find the most recent session across all projects:
```bash
fd -e jsonl . ~/.pi/agent/sessions/ -0 | xargs -0 ls -t | head -1
```

## Inspect a conversation

Use this branch when given a session file or asked what happened in a session.

### 1. Resolve one session

Use the supplied `.jsonl` path. If none is supplied, locate likely files under `~/.pi/agent/sessions/**/*.jsonl` using the project, time, or session ID from the request (see Finding Sessions), then identify the chosen file before querying it.

Completion criterion: exactly one session file is selected, unless the request explicitly compares sessions.

### 2. Profile its contents

Count events by role and content type before extracting text. This reveals the amount of conversation, thinking, tool calls, and tool results without loading their payloads.

Use the profiling query in [`references/queries.md`](references/queries.md).

Completion criterion: the session's message and content composition is known.

### 3. Extract the text-only transcript

The default conversation projection is:

- roles: `user`, `assistant`
- content type: `text`
- order: event timestamp, then content position

This selects conversational text while leaving tool calls, tool results, and thinking out of the transcript.

From this skill directory:

```bash
bash ./scripts/conversation-text.sh /absolute/path/to/session.jsonl \
  > /tmp/pi-conversation.csv
```

Read the complete output, in chunks when necessary. Preserve the transcript as evidence; summarize only after all extracted rows have been inspected.

Completion criterion: every text row in the selected conversation has been inspected, and the answer is grounded in those rows.

### 4. Broaden only for the question

If the transcript points to missing implementation or debugging evidence, query the relevant content explicitly — such as tool names, a specific tool result, or thinking blocks. Keep the text-only transcript as the primary narrative.

See [`references/queries.md`](references/queries.md) for transcript variants, fragment search, cost, and tool queries. See [`references/schema.md`](references/schema.md) when a content shape or event type is unclear.

## Analyze sessions

Use this branch for counts, trends, project activity, time ranges, costs, or comparisons across sessions.

Create the bundled views in a DuckDB database:

```bash
duckdb pi_sessions.duckdb < ./scripts/create_views.sql
```

The views are:

- `pi_events` — raw events with derived `session_id` and `session_group`
- `pi_messages` — message events
- `pi_conversation` — user/assistant text grouped into chronological message rows
- `pi_tool_calls` — assistant tool calls

Run the relevant query from [`references/queries.md`](references/queries.md), narrowing by session, project, or time range as early as possible.

Completion criterion: the query covers the requested scope and the result has been checked for unexpected roles or content types.

## JSONL record types

See [`references/schema.md`](references/schema.md) for the full event schema: the `session` header, `message` events (`user`, `assistant`, `toolResult`) and their content-item shapes (`text`, `thinking`, `toolCall`), plus `model_change`, `thinking_level_change`, `compaction`, `branch_summary`, and `custom_message`.

## DuckDB conventions

- Load JSONL with `format='newline_delimited'`.
- Use `filename=true` for grouping by source session.
- Use `ignore_errors=true` for heterogeneous event streams; use one file or an explicit schema when strict completeness matters.
- `~` is not expanded inside SQL. Use an absolute path or `getenv('HOME') || '...'`.

---

The DuckDB approach, views, and helper scripts are adapted from [kaofelix/dotfiles](https://github.com/kaofelix/dotfiles) (`pi-sessions-duckdb`).
