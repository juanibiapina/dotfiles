CREATE VIEW events AS
SELECT
  regexp_extract(filename, 'events/([^/]+)/', 1) AS host,
  to_timestamp(time_us / 1000000) AS time,
  time_us,
  event,
  "row",
  col,
  layer
FROM read_csv(
  'events/*/*.tsv',
  delim = '\t',
  header = false,
  auto_detect = false,
  filename = true,
  columns = {'time_us': 'BIGINT', 'event': 'VARCHAR', 'row': 'INTEGER', 'col': 'INTEGER', 'layer': 'INTEGER'}
);

CREATE VIEW flashes AS
SELECT
  regexp_extract(filename, 'flashes/([^/]+)\.tsv$', 1) AS host,
  to_timestamp(time_us / 1000000) AS time,
  time_us,
  layout
FROM read_csv(
  'flashes/*.tsv',
  delim = '\t',
  header = false,
  auto_detect = false,
  filename = true,
  columns = {'time_us': 'BIGINT', 'layout': 'VARCHAR'}
);

CREATE VIEW keys AS
WITH files AS (
  SELECT regexp_extract(filename, '([0-9a-f]+)\.json$', 1) AS layout, layers, keys
  FROM read_json('layouts/*.json', filename = true)
)
SELECT
  files.layout,
  layer,
  files.layers[layer + 1] AS layer_name,
  k.index,
  k."row",
  k.col,
  k.x,
  k.y,
  k.keycodes[layer + 1] AS keycode
FROM files, unnest(files.keys) AS t(k), range(len(files.layers)) AS l(layer);

CREATE VIEW presses AS
WITH downs AS (
  SELECT
    host, time, time_us, "row", col,
    lead(time_us) OVER (PARTITION BY host, "row", col ORDER BY time_us) AS next_down_us
  FROM events WHERE event = 'down'
),
sessions AS (
  SELECT host, time_us FROM events WHERE event IN ('connect', 'disconnect')
),
layers AS (
  SELECT host, time_us, layer FROM events WHERE event = 'layer'
),
ups AS (
  SELECT host, time_us, "row", col FROM events WHERE event = 'up'
),
with_layer AS (
  SELECT downs.*, coalesce(layers.layer, 0) AS layer
  FROM downs ASOF LEFT JOIN layers
    ON downs.host = layers.host AND downs.time_us > layers.time_us
),
with_session_end AS (
  SELECT with_layer.*, sessions.time_us AS session_end_us
  FROM with_layer ASOF LEFT JOIN sessions
    ON with_layer.host = sessions.host AND with_layer.time_us < sessions.time_us
),
with_hold AS (
  SELECT
    with_session_end.*,
    CASE
      WHEN ups.time_us < least(coalesce(next_down_us, ups.time_us + 1), coalesce(session_end_us, ups.time_us + 1))
      THEN (ups.time_us - with_session_end.time_us) // 1000
    END AS hold_ms
  FROM with_session_end ASOF LEFT JOIN ups
    ON with_session_end.host = ups.host AND with_session_end."row" = ups."row" AND with_session_end.col = ups.col
    AND with_session_end.time_us < ups.time_us
),
with_layout AS (
  SELECT with_hold.*, flashes.layout
  FROM with_hold ASOF LEFT JOIN flashes
    ON with_hold.time_us >= flashes.time_us
)
SELECT
  p.host,
  p.time,
  p.layout,
  p.layer,
  k.layer_name,
  k.index,
  p."row",
  p.col,
  k.x,
  k.y,
  CASE WHEN k.keycode = 'KC_TRNS' THEN base.keycode ELSE k.keycode END AS keycode,
  p.hold_ms
FROM with_layout AS p
LEFT JOIN keys AS k
  ON k.layout = p.layout AND k.layer = p.layer AND k."row" = p."row" AND k.col = p.col
LEFT JOIN keys AS base
  ON base.layout = p.layout AND base.layer = 0 AND base."row" = p."row" AND base.col = p.col;
