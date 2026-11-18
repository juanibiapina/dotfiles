import { test } from "node:test";
import assert from "node:assert/strict";
import { createSources } from "./sources.js";

// Trimmed from real `gh api -i '/notifications?per_page=…' --jq length` output:
// the status line ends in \n, the headers in \r\n.
const head = (status, headers) => `HTTP/2.0 ${status}\n` + headers.map((h) => `${h}\r\n`).join("") + "\r\n";
const OK_MORE = head("200 OK", [
  'Etag: W/"8084934f"',
  'Link: <https://api.github.com/notifications?per_page=50&page=2>; rel="next", <https://api.github.com/notifications?per_page=50&page=3>; rel="last"',
  "X-Poll-Interval: 60",
]) + "50\n";
const OK = head("200 OK", ['Etag: W/"64bc6fa5"', "X-Poll-Interval: 90"]) + "6\n";
const NOT_MODIFIED = head("304 Not Modified", ["X-Poll-Interval: 60"]);
const UNAUTHORIZED = head("401 Unauthorized", ["X-Github-Request-Id: ED5C"]) + '{"message":"Bad credentials","status":"401"}';

function fake(replies) {
  const calls = [];
  const exec = async (cmd, args) => { calls.push([cmd, ...args]); return replies.shift(); };
  const [github, gmail] = createSources({ exec });
  return { github, gmail, calls };
}

test("github counts threads not done and keeps the ETag", async () => {
  const { github } = fake([{ code: 0, stdout: OK, stderr: "" }]);
  assert.deepEqual(await github.check(), { count: 6, more: false, memo: { etag: 'W/"64bc6fa5"' }, interval: 90_000 });
});

test("github says more when there is a next page", async () => {
  const { github } = fake([{ code: 0, stdout: OK_MORE, stderr: "" }]);
  const r = await github.check();
  assert.equal(r.count, 50);
  assert.equal(r.more, true);
});

test("github sends the ETag and reads a 304 as unchanged", async () => {
  const { github, calls } = fake([{ code: 1, stdout: NOT_MODIFIED, stderr: "unexpected end of JSON input" }]);
  assert.deepEqual(await github.check({ etag: 'W/"64bc6fa5"' }), { unchanged: true, interval: 60_000 });
  assert.ok(calls[0].includes('If-None-Match: W/"64bc6fa5"'));
});

test("github throws gh's error when it fails", async () => {
  const { github } = fake([{ code: 1, stdout: UNAUTHORIZED, stderr: "gh: Bad credentials (HTTP 401)\n" }]);
  await assert.rejects(github.check(), /Bad credentials/);
});

test("gmail reads the inbox's unread threads, 0 when Gmail leaves the field out", async () => {
  const { gmail, calls } = fake([
    { code: 0, stdout: '{"label":{"id":"INBOX","threadsTotal":40,"threadsUnread":3}}', stderr: "" },
    { code: 0, stdout: '{"label":{"id":"INBOX","threadsTotal":4}}', stderr: "" },
  ]);
  assert.deepEqual(await gmail.check(), { count: 3 });
  assert.deepEqual(await gmail.check(), { count: 0 });
  assert.deepEqual(calls[0].slice(-5), ["gmail", "labels", "get", "INBOX", "--json"]);
});

// A Slack that answers client.counts with `counts` and every history with one
// new message, counting the calls.
function fakeSlack(counts) {
  const calls = [];
  globalThis.fetch = async (url, { body }) => {
    const method = url.split("/").pop();
    calls.push([method, new URLSearchParams(body).get("channel")]);
    const answer = method === "client.counts" ? counts
      : method === "conversations.history" ? { messages: [{ ts: "200.0", user: "U2", text: "new" }, { ts: "100.0", user: "U1", text: "old" }] }
      : { channels: [] };
    return { status: 200, text: async () => JSON.stringify({ ok: true, ...answer }) };
  };
  return calls;
}

const im = (id, latest, unread) => ({ id, latest, last_read: "100.0", has_unreads: unread, mention_count: unread ? 1 : 0 });

test("slack counts what needs Juan and refreshes the dialog's cache only when the counts move", async () => {
  const counts = {
    channels: [{ id: "C1", latest: "100.0", last_read: "100.0", has_unreads: false, mention_count: 0 }, { id: "C2", latest: "300.0", last_read: "1.0", has_unreads: true, mention_count: 0 }],
    mpims: [], ims: [im("D1", "200.0", true)], threads: { has_unreads: true, mention_count: 1 },
  };
  const calls = fakeSlack(counts);
  let file = JSON.stringify({ version: 3, current: "C1", counts: {}, convs: [{ id: "C1" }, { id: "C2" }, { id: "D1" }], histories: [["C1", [{ ts: "100.0" }]], ["D1", [{ ts: "100.0" }]]] });
  let reads = 0;
  const [, , slack] = createSources({
    exec: async () => ({ code: 0, stdout: '{"xoxc":"x","xoxd":"d"}', stderr: "" }),
    home: () => "/home",
    readTextFile: async () => { reads++; return file; },
    writeTextFile: async (_path, text, expected) => { assert.equal(expected, file); file = text; },
    dialogOpen: () => false,
  });

  // D1 unread and the thread mention; C2 is unread without a mention.
  assert.deepEqual(await slack.check(), { count: 2 });
  const cache = JSON.parse(file);
  assert.deepEqual(cache.histories.map(([id, m]) => [id, m.map((x) => x.ts)]), [["C1", ["100.0"]], ["D1", ["100.0", "200.0"]]]);
  assert.equal(cache.counts.D1.unread, true);
  assert.deepEqual(calls.map(([m, ch]) => ch ?? m), ["client.counts", "D1"]);

  await slack.check();
  assert.equal(reads, 1);
  assert.equal(calls.length, 3);
});
