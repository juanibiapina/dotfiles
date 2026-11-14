import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, filter, label, labelKey, linksOf, presets, rank, startArgv, targets } from "./routing.js";

const pr = { repo: "o/r", number: 7, kind: "pr", url: "https://github.com/o/r/pull/7", title: "Fix it", reason: "review_requested", head: "fix-it" };
const session = (address, extra = {}) => ({ address, machine: null, name: address, space: "s", cwd: "/home/j", branch: null, status: "idle", labels: {}, recency: 0, ...extra });

test("ranks sessions that handle the thread, then its branch, then its repo, then the rest", () => {
  const ranked = rank([
    session("other", { recency: 9 }),
    session("repo", { cwd: "/home/j/workspace/o/r/src" }),
    session("branch", { cwd: "/home/j/workspace/o/r", branch: "fix-it" }),
    session("linked", { labels: { [labelKey(pr)]: "2026-01-01T00:00:00Z" } }),
  ], pr);
  assert.deepEqual(ranked.map((r) => [r.session.address, r.why]), [["linked", "linked"], ["branch", "branch"], ["repo", "repo"], ["other", null]]);
});

test("puts the most recently routed session first and breaks other ties by recency", () => {
  const key = labelKey(pr);
  const ranked = rank([
    session("old", { labels: { [key]: "2026-01-01T00:00:00Z" } }),
    session("new", { labels: { [key]: "2026-02-01T00:00:00Z" } }),
    session("a", { cwd: "/w/workspace/o/r", recency: 1 }),
    session("b", { cwd: "/w/workspace/o/r", recency: 5 }),
  ], pr);
  assert.deepEqual(ranked.map((r) => r.session.address), ["new", "old", "b", "a"]);
});

test("counts worktree checkouts as the repo, and not a repo whose name only starts the same", () => {
  const ranked = rank([
    session("wt", { cwd: "/home/j/.herdr/worktrees/r/fix-it" }),
    session("near", { cwd: "/home/j/workspace/o/r-other" }),
  ], pr);
  assert.deepEqual(ranked.map((r) => [r.session.address, r.why]), [["wt", "repo"], ["near", null]]);
});

test("lists fitting sessions, then places, then the rest, and flags sessions that need you", () => {
  const place = { kind: "space", space: { id: "sp", name: "r", folder: "/w/workspace/o/r", machine: null } };
  const list = targets([session("x"), session("y", { cwd: "/w/workspace/o/r", status: "blocked" })], [place], pr);
  assert.deepEqual(list.map((t) => t.kind === "place" ? "place" : t.session.address), ["y", "place", "x"]);
  assert.equal(list[0].blocked, true);
  assert.match(describe(list[0], pr).detail, /needs you/);
  assert.deepEqual(filter(list, "new session", pr).map((t) => t.kind), ["place"]);
});

test("offers presets that fit the thread, each with its link and none switching branches", () => {
  const review = presets(pr);
  assert.equal(review[0].id, "review");
  assert.ok(!review.some((p) => p.id === "fix"));
  const mine = presets({ ...pr, reason: "author", failing: true }, { linkedAt: "2026-01-01T00:00:00Z" });
  assert.deepEqual(mine.slice(0, 2).map((p) => p.id), ["since", "fix"]);
  for (const p of [...review, ...mine, ...presets({ ...pr, kind: "issue" })]) {
    assert.ok(p.text.includes(pr.url));
    assert.ok(!p.text.includes("gh pr checkout"));
  }
});

test("leaves threads without a number unlinked", () => {
  const ci = { repo: "o/r", kind: "ci", url: "https://github.com/o/r/actions/runs/1", title: "CI failed" };
  assert.equal(label(ci), null);
  assert.deepEqual(rank([session("x", { labels: { "github.o/r#undefined": "t" } })], ci).map((r) => r.why), [null]);
});

test("reads back the threads a session was given", () => {
  const s = session("x", { labels: {
    [label({ repo: "my.org/some-repo", number: 12 }, new Date("2026-01-01T00:00:00Z")).split("=")[0]]: "2026-01-01T00:00:00Z",
    [labelKey(pr)]: "2026-01-02T00:00:00Z",
    "herdr.space": "sp1",
  } });
  assert.deepEqual(linksOf(s), [
    { repo: "my.org/some-repo", number: 12, at: "2026-01-01T00:00:00Z" },
    { repo: "o/r", number: 7, at: "2026-01-02T00:00:00Z" },
  ]);
});

test("a new session's command runs the agent with its arguments untouched", () => {
  const tricky = "it's $HOME `x` \"quoted\"";
  const [cmd, ...args] = startArgv(["printf", "%s|", tricky], "");
  assert.equal(execFileSync(cmd, args).toString(), `${tricky}|`);
});
