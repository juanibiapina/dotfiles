-- Create convenience views for Pi session inspection and analytics.
--
-- Usage:
--   duckdb pi_sessions.duckdb < scripts/create_views.sql
--
-- The underlying data is newline-delimited JSONL under ~/.pi/agent/sessions/**.

CREATE OR REPLACE VIEW pi_events AS
SELECT
  *,
  -- UUID at the end of the file name (matches how Pi names session files)
  regexp_extract(filename, '([0-9a-f\-]{36})\.jsonl$', 1) AS session_id,
  -- Folder name under sessions/, e.g. "--Users-alice-Code-myproj--"
  regexp_extract(filename, '/sessions/([^/]+)/', 1) AS session_group
FROM read_json_auto(
  getenv('HOME') || '/.pi/agent/sessions/**/*.jsonl',
  format='newline_delimited',
  filename=true,
  ignore_errors=true
);

-- Only the message events.
CREATE OR REPLACE VIEW pi_messages AS
SELECT
  session_id,
  session_group,
  filename,
  id AS event_id,
  timestamp AS event_timestamp,
  message.role AS role,
  message.timestamp AS message_timestamp,
  message.content AS content
FROM pi_events
WHERE type = 'message';

-- User and assistant conversational text, excluding other content shapes by projection.
CREATE OR REPLACE VIEW pi_conversation AS
SELECT
  session_id,
  session_group,
  filename,
  event_id,
  event_timestamp,
  role,
  string_agg(item.text, chr(10) ORDER BY ordinality) AS text
FROM pi_messages,
  UNNEST(content) WITH ORDINALITY AS u(item, ordinality)
WHERE
  role IN ('user', 'assistant')
  AND item.type = 'text'
GROUP BY
  session_id,
  session_group,
  filename,
  event_id,
  event_timestamp,
  role;

-- Tool calls are embedded in assistant message content[] entries.
CREATE OR REPLACE VIEW pi_tool_calls AS
SELECT
  session_id,
  session_group,
  filename,
  timestamp AS event_timestamp,
  item.id AS tool_call_id,
  item.name AS tool_name,
  item.arguments AS tool_arguments
FROM pi_events,
  UNNEST(message.content) AS u(item)
WHERE
  type = 'message'
  AND message.role = 'assistant'
  AND item.type = 'toolCall';
