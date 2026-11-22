import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCHEMA_VERSION = "1";
const CHUNK_BYTES = 1 << 20;
const HEADER_CHUNK_BYTES = 4096;
const ANCHOR_BYTES = 64;
const PROMPT_CHARS = 200;
const PREFIX_BYTES = 256;
const BATCH_FILES = 500;
const DEBOUNCE_MS = 200;
const RESCAN_MS = 10 * 60 * 1000;
const NEWLINE = 10;
const CONFLICT_COPY = /\.sync-conflict-\d{8}-\d{6}-[A-Z0-9]+\.jsonl$/;
const ENTRY_PREFIX = /^\{"type":"([a-z_]+)"(?:,"id":"[^"]*","parentId":(?:"[^"]*"|null),"timestamp":"[^"]*","message":\{"role":"([a-zA-Z]+)")?/;

const SCHEMA = `
create table sessions (
  path text primary key,
  id text not null,
  title text,
  first_prompt text,
  cwd text not null,
  created_at integer not null,
  last_active_at integer not null,
  file_size integer not null,
  file_mtime_ms integer not null,
  parsed_offset integer not null,
  anchor blob not null,
  header_hash text not null
);
create index sessions_recent on sessions(last_active_at desc, id);
create view recent_sessions as
  select id, title, first_prompt as firstPrompt, cwd, last_active_at as lastActiveAt, path as sessionFile
  from sessions;
create table meta (key text primary key, value text);
`;

function isSessionFileName(name) {
  return name.endsWith(".jsonl") && !name.startsWith(".") && !CONFLICT_COPY.test(name);
}

function isSessionDirName(name) {
  return !name.startsWith(".");
}

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function readDir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

const chunks = new Map();

function forEachLine(fd, start, onLine, chunkBytes = CHUNK_BYTES) {
  if (!chunks.has(chunkBytes)) chunks.set(chunkBytes, Buffer.allocUnsafe(chunkBytes));
  const chunk = chunks.get(chunkBytes);
  let pos = start;
  let carry = null;
  let end = start;
  for (;;) {
    const read = fs.readSync(fd, chunk, 0, chunkBytes, pos);
    if (read === 0) break;
    const data = carry ? Buffer.concat([carry, chunk.subarray(0, read)]) : chunk.subarray(0, read);
    const base = pos - (carry ? carry.length : 0);
    pos += read;
    let lineStart = 0;
    let newline;
    while ((newline = data.indexOf(NEWLINE, lineStart)) !== -1) {
      const keepGoing = onLine(data.subarray(lineStart, newline));
      lineStart = newline + 1;
      end = base + lineStart;
      if (keepGoing === false) return { end, tail: null };
    }
    carry = lineStart < data.length ? Buffer.from(data.subarray(lineStart)) : null;
  }
  return { end, tail: carry };
}

function parseLine(bytes) {
  const text = bytes.toString("utf8");
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function mayMatter(bytes) {
  const match = ENTRY_PREFIX.exec(bytes.toString("latin1", 0, Math.min(bytes.length, PREFIX_BYTES)));
  if (!match) return true;
  if (match[1] === "message") return match[2] === undefined || match[2] === "user" || match[2] === "assistant";
  return match[1] === "session_info";
}

function readHeader(fd) {
  let header = null;
  const visit = (bytes) => {
    const entry = parseLine(bytes);
    if (entry === undefined) return true;
    if (entry && entry.type === "session" && typeof entry.id === "string") {
      header = { entry, hash: createHash("sha1").update(bytes).digest("hex") };
    }
    return false;
  };
  const { tail } = forEachLine(fd, 0, visit, HEADER_CHUNK_BYTES);
  if (!header && tail) visit(tail);
  return header;
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((block) => block && block.type === "text")
    .map((block) => block.text)
    .join(" ");
}

function applyEntry(state, entry) {
  if (!entry || typeof entry !== "object") return;
  if (entry.type === "session_info") {
    state.title = (typeof entry.name === "string" ? entry.name.trim() : "") || null;
    return;
  }
  if (entry.type !== "message") return;
  const message = entry.message;
  if (!message || typeof message !== "object" || typeof message.role !== "string" || !("content" in message)) return;
  if (message.role !== "user" && message.role !== "assistant") return;
  const time = typeof message.timestamp === "number" ? message.timestamp : new Date(entry.timestamp).getTime();
  if (!Number.isNaN(time)) state.lastMessageAt = Math.max(state.lastMessageAt ?? 0, time);
  if (state.firstPrompt === null && message.role === "user") {
    const text = textOf(message.content);
    if (text) state.firstPrompt = text.slice(0, PROMPT_CHARS).replace(/[\uD800-\uDBFF]$/, "");
  }
}

function parseEntries(fd, start, state) {
  const apply = (bytes) => {
    if (mayMatter(bytes)) applyEntry(state, parseLine(bytes));
  };
  const { end, tail } = forEachLine(fd, start, apply);
  if (tail) apply(tail);
  return end;
}

function readAnchor(fd, offset) {
  const length = Math.min(ANCHOR_BYTES, offset);
  const anchor = Buffer.alloc(length);
  if (length > 0) fs.readSync(fd, anchor, 0, length, offset - length);
  return anchor;
}

function sameBytes(a, b) {
  return Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
}

function canAppend(fd, row, stat) {
  if (stat.size <= row.file_size || stat.size < row.parsed_offset) return false;
  if (row.last_active_at === row.created_at) return false;
  const header = readHeader(fd);
  if (!header || header.hash !== row.header_hash) return false;
  return sameBytes(readAnchor(fd, row.parsed_offset), row.anchor);
}

function parseSession(fd, row, stat) {
  if (row && canAppend(fd, row, stat)) {
    const state = { title: row.title, firstPrompt: row.first_prompt, lastMessageAt: row.last_active_at };
    const end = parseEntries(fd, row.parsed_offset, state);
    return { id: row.id, cwd: row.cwd, createdAt: row.created_at, headerHash: row.header_hash, end, ...state };
  }
  const header = readHeader(fd);
  if (!header) return null;
  const headerTime = typeof header.entry.timestamp === "string" ? new Date(header.entry.timestamp).getTime() : NaN;
  const state = { title: null, firstPrompt: null, lastMessageAt: undefined };
  const end = parseEntries(fd, 0, state);
  return {
    id: header.entry.id,
    cwd: typeof header.entry.cwd === "string" ? header.entry.cwd : "",
    createdAt: Number.isNaN(headerTime) ? Math.floor(stat.mtimeMs) : headerTime,
    headerHash: header.hash,
    end,
    ...state,
  };
}

function openDatabase(dbPath) {
  const db = new DatabaseSync(dbPath);
  db.exec("pragma journal_mode = wal; pragma synchronous = normal; pragma busy_timeout = 5000;");
  const hasMeta = db.prepare("select 1 from sqlite_master where type = 'table' and name = 'meta'").get();
  const version = hasMeta ? db.prepare("select value from meta where key = 'schema_version'").get()?.value : undefined;
  if (version !== SCHEMA_VERSION) {
    db.exec("drop view if exists recent_sessions; drop table if exists sessions; drop table if exists meta;");
    db.exec(SCHEMA);
    db.prepare("insert into meta (key, value) values ('schema_version', ?)").run(SCHEMA_VERSION);
  }
  return db;
}

export function openCatalog({ root, dbPath, log = () => {} }) {
  const realRoot = fs.realpathSync(root);
  const db = openDatabase(dbPath);
  const getRow = db.prepare("select * from sessions where path = ?");
  const deleteRow = db.prepare("delete from sessions where path = ?");
  const allPaths = db.prepare("select path from sessions");
  const setMeta = db.prepare("insert into meta (key, value) values (?, ?) on conflict (key) do update set value = excluded.value");
  const upsert = db.prepare(`
    insert into sessions (path, id, title, first_prompt, cwd, created_at, last_active_at, file_size, file_mtime_ms, parsed_offset, anchor, header_hash)
    values (:path, :id, :title, :first_prompt, :cwd, :created_at, :last_active_at, :file_size, :file_mtime_ms, :parsed_offset, :anchor, :header_hash)
    on conflict (path) do update set
      id = excluded.id, title = excluded.title, first_prompt = excluded.first_prompt, cwd = excluded.cwd,
      created_at = excluded.created_at, last_active_at = excluded.last_active_at, file_size = excluded.file_size,
      file_mtime_ms = excluded.file_mtime_ms, parsed_offset = excluded.parsed_offset, anchor = excluded.anchor,
      header_hash = excluded.header_hash
  `);

  function sessionDirs() {
    return readDir(realRoot)
      .filter(isSessionDirName)
      .map((name) => path.join(realRoot, name))
      .filter(isDirectory);
  }

  function sessionFiles(dir) {
    return readDir(dir)
      .filter(isSessionFileName)
      .map((name) => path.join(dir, name));
  }

  function isSessionPath(file) {
    const parent = path.dirname(file);
    return path.dirname(parent) === realRoot && isSessionDirName(path.basename(parent)) && isSessionFileName(path.basename(file));
  }

  function resolve(file) {
    try {
      return path.join(fs.realpathSync(path.dirname(file)), path.basename(file));
    } catch {
      return null;
    }
  }

  function syncFile(given) {
    const file = resolve(given);
    if (!file || !isSessionPath(file)) return;
    let stat;
    try {
      stat = fs.statSync(file);
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    if (!stat.isFile()) return;
    const row = getRow.get(file);
    const mtime = Math.floor(stat.mtimeMs);
    if (row && row.file_size === stat.size && row.file_mtime_ms === mtime) return;
    const fd = fs.openSync(file, "r");
    try {
      const session = parseSession(fd, row, stat);
      if (!session) {
        if (row) deleteRow.run(file);
        return;
      }
      upsert.run({
        path: file,
        id: session.id,
        title: session.title,
        first_prompt: session.firstPrompt,
        cwd: session.cwd,
        created_at: session.createdAt,
        last_active_at: session.lastMessageAt > 0 ? session.lastMessageAt : session.createdAt,
        file_size: stat.size,
        file_mtime_ms: mtime,
        parsed_offset: session.end,
        anchor: readAnchor(fd, session.end),
        header_hash: session.headerHash,
      });
    } finally {
      fs.closeSync(fd);
    }
  }

  function sync(file) {
    try {
      syncFile(file);
    } catch (error) {
      log(`sync ${file}: ${error.message}`);
    }
  }

  function syncFiles(files) {
    for (let i = 0; i < files.length; i += BATCH_FILES) {
      db.exec("begin");
      try {
        files.slice(i, i + BATCH_FILES).forEach(sync);
        db.exec("commit");
      } catch (error) {
        db.exec("rollback");
        throw error;
      }
    }
  }

  function syncDir(dir) {
    syncFiles(sessionFiles(dir));
  }

  function scan() {
    const dirs = sessionDirs();
    const files = dirs.flatMap(sessionFiles);
    syncFiles(files);
    const seen = new Set(files);
    for (const { path: file } of allPaths.all()) {
      if (!seen.has(file) && !fs.existsSync(file)) deleteRow.run(file);
    }
    setMeta.run("scan_completed_at", new Date().toISOString());
    return { dirs, files: files.length };
  }

  return { root: realRoot, sync, syncDir, scan, close: () => db.close() };
}

function serve({ root, dbPath }) {
  const log = (message) => console.error(`${new Date().toISOString()} ${message}`);
  const catalog = openCatalog({ root, dbPath, log });
  const watchers = new Map();
  const pending = new Map();
  let scanQueued = false;

  function syncLater(file) {
    clearTimeout(pending.get(file));
    pending.set(file, setTimeout(() => {
      pending.delete(file);
      catalog.sync(file);
    }, DEBOUNCE_MS));
  }

  function unwatch(dir) {
    watchers.get(dir)?.close();
    watchers.delete(dir);
  }

  function watch(dir, onEvent) {
    if (watchers.has(dir)) return;
    try {
      const watcher = fs.watch(dir, onEvent);
      watcher.on("error", (error) => {
        log(`watch ${dir}: ${error.message}`);
        unwatch(dir);
        scanSoon();
      });
      watchers.set(dir, watcher);
    } catch (error) {
      log(`watch ${dir}: ${error.message}`);
    }
  }

  function watchSessionDir(dir) {
    watch(dir, (_event, name) => {
      if (name === null) catalog.syncDir(dir);
      else if (isSessionFileName(name)) syncLater(path.join(dir, name));
    });
  }

  function watchRoot() {
    watch(catalog.root, (_event, name) => {
      if (name === null) return scanSoon();
      if (!isSessionDirName(name)) return;
      const dir = path.join(catalog.root, name);
      if (!isDirectory(dir)) return unwatch(dir);
      if (watchers.has(dir)) return;
      watchSessionDir(dir);
      catalog.syncDir(dir);
    });
  }

  function fullScan() {
    const started = Date.now();
    watchRoot();
    const before = new Set(watchers.keys());
    try {
      const { dirs, files } = catalog.scan();
      for (const dir of dirs) {
        watchSessionDir(dir);
        before.delete(dir);
      }
      before.delete(catalog.root);
      before.forEach(unwatch);
      log(`scan: ${files} sessions in ${dirs.length} directories, ${Date.now() - started} ms`);
    } catch (error) {
      log(`scan: ${error.stack}`);
    }
  }

  function scanSoon() {
    if (scanQueued) return;
    scanQueued = true;
    setImmediate(() => {
      scanQueued = false;
      fullScan();
    });
  }

  const stop = () => {
    catalog.close();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);

  log(`indexing ${catalog.root} into ${dbPath}`);
  fullScan();
  setInterval(fullScan, RESCAN_MS);
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  const dbPath = process.env.PI_CATALOG_DB || path.join(os.homedir(), ".local/state/pi-catalog/catalog.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  serve({ root: process.env.PI_CATALOG_ROOT || path.join(os.homedir(), ".pi/agent/sessions"), dbPath });
}
