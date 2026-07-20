#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 /absolute/path/to/session.jsonl" >&2
  exit 2
fi

session_file=$1

if [[ ! -f "$session_file" ]]; then
  echo "session file not found: $session_file" >&2
  exit 1
fi

PI_SESSION_FILE=$session_file duckdb -csv -c "
SELECT
  e.timestamp,
  e.message.role AS role,
  string_agg(item.text, chr(10) ORDER BY ordinality) AS text
FROM read_json_auto(
  getenv('PI_SESSION_FILE'),
  format='newline_delimited',
  ignore_errors=true
) AS e,
UNNEST(e.message.content) WITH ORDINALITY AS u(item, ordinality)
WHERE e.type = 'message'
  AND e.message.role IN ('user', 'assistant')
  AND item.type = 'text'
GROUP BY e.id, e.timestamp, e.message.role
ORDER BY e.timestamp;
"
