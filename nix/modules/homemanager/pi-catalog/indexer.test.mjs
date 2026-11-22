import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openCatalog } from "./indexer.mjs";

let tmp, root, dir, dbPath, catalog;

const header = (id, cwd = "/work/repo", timestamp = "2026-11-01T10:00:00.000Z") =>
  ({ type: "session", version: 3, id, timestamp, cwd });
const user = (text, timestamp) =>
  ({ type: "message", id: `u${timestamp}`, timestamp: new Date(timestamp).toISOString(), message: { role: "user", content: [{ type: "text", text }], timestamp } });
const assistant = (text, timestamp) =>
  ({ type: "message", id: `a${timestamp}`, timestamp: new Date(timestamp).toISOString(), message: { role: "assistant", content: [{ type: "text", text }], timestamp } });
const name = (title) => ({ type: "session_info", id: `n${title}`, timestamp: "2026-11-01T10:00:00.000Z", name: title });
const lines = (...entries) => entries.map((entry) => JSON.stringify(entry) + "\n").join("");

const T = Date.parse("2026-11-01T11:00:00.000Z");

function recent() {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare("select * from recent_sessions order by lastActiveAt desc, id").all().map((row) => ({ ...row }));
  } finally {
    db.close();
  }
}

function only() {
  const rows = recent();
  assert.equal(rows.length, 1);
  return rows[0];
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "pi-catalog-")));
  root = path.join(tmp, "sessions");
  dir = path.join(root, "--work-repo--");
  fs.mkdirSync(dir, { recursive: true });
  dbPath = path.join(tmp, "catalog.sqlite");
  catalog = openCatalog({ root, dbPath });
});

afterEach(() => {
  catalog.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("scan lists a session with its header, first prompt, and last message time", () => {
  const file = path.join(dir, "a.jsonl");
  write(file, lines(header("a"), user("hello there", T), assistant("hi", T + 1000)));
  catalog.scan();
  assert.deepEqual(only(), {
    id: "a", title: null, firstPrompt: "hello there", cwd: "/work/repo", lastActiveAt: T + 1000, sessionFile: file,
  });
});

test("a session without messages is active at its header time", () => {
  write(path.join(dir, "a.jsonl"), lines(header("a")));
  catalog.scan();
  assert.equal(only().lastActiveAt, Date.parse("2026-11-01T10:00:00.000Z"));
});

test("a forked session keeps the time of its copied messages", () => {
  write(path.join(dir, "a.jsonl"), lines(header("a", "/w", "2026-11-05T00:00:00.000Z"), user("old", T)));
  catalog.scan();
  assert.equal(only().lastActiveAt, T);
});

test("the first prompt is truncated to 200 characters", () => {
  write(path.join(dir, "a.jsonl"), lines(header("a"), user("x".repeat(500), T)));
  catalog.scan();
  assert.equal(only().firstPrompt, "x".repeat(200));
});

test("appended messages and renames update the session", () => {
  const file = path.join(dir, "a.jsonl");
  write(file, lines(header("a"), user("first", T)));
  catalog.sync(file);
  fs.appendFileSync(file, lines(name("  Named  "), assistant("reply", T + 5000)));
  catalog.sync(file);
  assert.deepEqual([only().title, only().firstPrompt, only().lastActiveAt], ["Named", "first", T + 5000]);
  fs.appendFileSync(file, lines(name("Renamed")));
  catalog.sync(file);
  assert.equal(only().title, "Renamed");
  fs.appendFileSync(file, lines(name("")));
  catalog.sync(file);
  assert.equal(only().title, null);
});

test("the first message of a new session is picked up after the header alone was indexed", () => {
  const file = path.join(dir, "a.jsonl");
  write(file, lines(header("a", "/w", "2026-11-05T00:00:00.000Z")));
  catalog.sync(file);
  fs.appendFileSync(file, lines(user("older than the header", T)));
  catalog.sync(file);
  assert.deepEqual([only().firstPrompt, only().lastActiveAt], ["older than the header", T]);
});

test("an in-place rewrite of the same size is reparsed", () => {
  const file = path.join(dir, "a.jsonl");
  write(file, lines(header("a"), name("AAAA"), user("one", T)));
  catalog.sync(file);
  const before = fs.statSync(file).size;
  write(file, lines(header("a"), name("BBBB"), user("two", T)));
  fs.utimesSync(file, new Date(), new Date(Date.now() + 5000));
  assert.equal(fs.statSync(file).size, before);
  catalog.sync(file);
  assert.deepEqual([only().title, only().firstPrompt], ["BBBB", "two"]);
});

test("an in-place rewrite that grows the file is reparsed", () => {
  const file = path.join(dir, "a.jsonl");
  write(file, lines(header("a"), name("Old"), user("one", T)));
  catalog.sync(file);
  write(file, lines(header("a"), user("rewritten", T + 1), name("New title"), assistant("more", T + 2)));
  catalog.sync(file);
  assert.deepEqual([only().title, only().firstPrompt, only().lastActiveAt], ["New title", "rewritten", T + 2]);
});

test("a rewrite with a different header is reparsed", () => {
  const file = path.join(dir, "a.jsonl");
  write(file, lines(header("a"), user("one", T)));
  catalog.sync(file);
  write(file, lines(header("b", "/other"), user("one", T), user("two", T + 1)));
  catalog.sync(file);
  assert.deepEqual([only().id, only().cwd], ["b", "/other"]);
});

test("appends after a Syncthing-style rename are picked up", () => {
  const file = path.join(dir, "a.jsonl");
  write(file, lines(header("a"), user("one", T)));
  catalog.sync(file);
  const temp = path.join(dir, ".syncthing.a.jsonl.tmp");
  write(temp, fs.readFileSync(file) + lines(assistant("two", T + 1)));
  catalog.sync(temp);
  fs.renameSync(temp, file);
  catalog.sync(file);
  fs.appendFileSync(file, lines(name("After rename"), assistant("three", T + 2)));
  catalog.sync(file);
  assert.deepEqual([only().title, only().lastActiveAt], ["After rename", T + 2]);
});

test("a partial final line is read once it is complete", () => {
  const file = path.join(dir, "a.jsonl");
  const last = JSON.stringify(name("Done"));
  write(file, lines(header("a"), user("one", T)) + last.slice(0, 10));
  catalog.sync(file);
  assert.equal(only().title, null);
  fs.appendFileSync(file, last.slice(10) + "\n");
  catalog.sync(file);
  assert.equal(only().title, "Done");
});

test("a deleted session stays until a scan confirms it is gone", () => {
  const file = path.join(dir, "a.jsonl");
  write(file, lines(header("a"), user("one", T)));
  catalog.scan();
  fs.rmSync(file);
  catalog.sync(file);
  assert.equal(recent().length, 1);
  catalog.scan();
  assert.deepEqual(recent(), []);
});

test("a scan finds sessions in a new directory", () => {
  catalog.scan();
  const file = path.join(root, "--new-dir--", "b.jsonl");
  write(file, lines(header("b", "/new/dir"), user("hi", T)));
  catalog.scan();
  assert.equal(only().sessionFile, file);
});

test("a scan skips files Pi does not list", () => {
  write(path.join(dir, "kept.jsonl"), lines(header("kept"), user("hi", T)));
  write(path.join(dir, "kept.sync-conflict-20261101-101010-ABCDEFG.jsonl"), lines(header("conflict")));
  write(path.join(dir, ".syncthing.kept.jsonl.tmp"), lines(header("temp")));
  write(path.join(dir, "notes.txt"), lines(header("txt")));
  write(path.join(dir, "no-header.jsonl"), lines(user("orphan", T)));
  write(path.join(dir, "nested", "deep.jsonl"), lines(header("deep")));
  write(path.join(root, ".stfolder", "x.jsonl"), lines(header("stfolder")));
  write(path.join(root, "top.jsonl"), lines(header("top")));
  catalog.scan();
  assert.deepEqual(recent().map((row) => row.id), ["kept"]);
});

test("sessions are ordered by last activity, newest first", () => {
  write(path.join(dir, "old.jsonl"), lines(header("old"), user("a", T)));
  write(path.join(dir, "new.jsonl"), lines(header("new"), user("b", T + 10)));
  catalog.scan();
  assert.deepEqual(recent().map((row) => row.id), ["new", "old"]);
});

test("sessions under a symlinked root are stored under the real path", () => {
  const link = path.join(tmp, "link");
  fs.symlinkSync(root, link);
  catalog.close();
  catalog = openCatalog({ root: link, dbPath });
  write(path.join(dir, "a.jsonl"), lines(header("a"), user("one", T)));
  catalog.sync(path.join(link, "--work-repo--", "a.jsonl"));
  assert.equal(only().sessionFile, path.join(dir, "a.jsonl"));
});

test("a scan of an unchanged catalog keeps every session", () => {
  write(path.join(dir, "a.jsonl"), lines(header("a"), user("one", T)));
  catalog.scan();
  catalog.close();
  catalog = openCatalog({ root, dbPath });
  catalog.scan();
  assert.equal(only().id, "a");
});
