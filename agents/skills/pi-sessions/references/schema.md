# Pi session log schema (JSONL)

This is a pragmatic schema description for querying `~/.pi/agent/sessions/**/*.jsonl` with DuckDB.

The logs are **event streams** (one JSON object per line). Different event `type`s have different fields.

## Top-level fields (common)

Most events include:

- `type` (string) – event type; common values include `session`, `message`, `model_change`, etc.
- `id` (string) – event id (not always present)
- `parentId` (string|null) – parent event id (often present)
- `timestamp` – ISO timestamp in the file; `read_json_auto` infers it as a DuckDB `TIMESTAMP`, so compare/sort it directly without casting

When you load with `filename=true`, DuckDB adds:

- `filename` (string) – the source `.jsonl` path

Recommended derived fields:

- `session_id` – extract from `filename` (UUID at end of file name)
- `session_group` – folder name under `sessions/` (often encodes cwd/project)

Records link via `id`/`parentId`, forming a conversation tree.

## `type = 'session'`

The first line is typically the session header:

- `version` (int)
- `id` (uuid string) – the session id
- `timestamp` (string)
- `cwd` (string)

## `type = 'message'`

A message event wraps a `message` struct:

- `message.role` (string)
  - common: `user`, `assistant`, `toolResult`
  - sometimes: `bashExecution`
- `message.content` (array)
  - elements are objects with a `type` discriminator

### `message.content[]` item shapes (common)

The content array is heterogeneous. Common item types you’ll see:

- `type='text'`
  - `text` (string)
- `type='thinking'`
  - `thinking` (string)
  - `thinkingSignature` (string, sometimes)
- `type='toolCall'`
  - `id` (string)
  - `name` (string) – tool name (`read`, `bash`, `edit`, `write`, etc.)
  - `arguments` (struct) – tool args; the struct shape depends on the tool. The values are scalars, not arrays: `bash` has `arguments.command` (string), `read`/`write`/`edit` have `arguments.path` (string). Slice or aggregate them as strings (`substring`, `regexp_replace`), never with array functions.

Tool results usually appear as separate message events with `message.role='toolResult'` and fields like:

- `toolCallId`
- `toolName`
- `content` (array of content items)
- `isError` (boolean)

Assistant messages also carry `message.model`, `message.provider`, `message.usage` (with `input`, `output`, `cacheRead`, `cacheWrite`, `cost.total`), and `message.stopReason`.

## Other event types

Non-message events that appear in the stream:

- `type='model_change'` – model switched. `provider`, `modelId`.
- `type='thinking_level_change'` – thinking budget switched. `thinkingLevel`.
- `type='compaction'` – context summarized to save tokens. `summary`, `tokensBefore`.
- `type='branch_summary'` – user switched branches in the conversation tree.
- `type='custom_message'` – extension-injected message (e.g. plan mode).

## Conversation projection

A compact human conversation is not a distinct event type. Derive it by selecting:

- message roles `user` and `assistant`
- content items with `type='text'`
- content position from `UNNEST(... WITH ORDINALITY)`

Group text items by message event and order messages by event timestamp. Other projections can deliberately select `thinking`, `toolCall`, or `toolResult` when the question requires them.

## DuckDB tips

- Use `UNNEST(message.content)` to explode tool calls.
- Use `ignore_errors=true` during `read_json_auto(...)` if schema inference fails due to heterogeneous structs.
- Use `LIMIT` on `pi_events` to quickly inspect real shapes before writing complex queries.
