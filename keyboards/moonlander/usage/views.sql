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
  SELECT host, time, time_us, "row", col FROM events WHERE event = 'down'
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
with_hold AS (
  SELECT with_layer.*, (ups.time_us - with_layer.time_us) // 1000 AS hold_ms
  FROM with_layer ASOF LEFT JOIN ups
    ON with_layer.host = ups.host AND with_layer."row" = ups."row" AND with_layer.col = ups.col
    AND with_layer.time_us < ups.time_us
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
