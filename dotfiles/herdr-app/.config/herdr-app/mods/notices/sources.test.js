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
