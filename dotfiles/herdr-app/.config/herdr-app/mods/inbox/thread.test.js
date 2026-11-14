import { test } from "node:test";
import assert from "node:assert/strict";
import { baseline, digest } from "./thread.js";

const comment = (id, who, at, extra = {}) => ({ __typename: "IssueComment", id, author: { login: who }, createdAt: at, body: `${who} says hi`, ...extra });
const commit = (id, who, at, headline) => ({ __typename: "PullRequestCommit", id, commit: { author: { user: { login: who } }, committedDate: at, messageHeadline: headline } });
const label = (type, id, who, at, name) => ({ __typename: type, id, actor: { login: who }, createdAt: at, label: { name } });

function issue(nodes, extra = {}) {
  return {
    __typename: "Issue", id: "I1", number: 7, title: "Broken", url: "https://github.com/o/r/issues/7", state: "OPEN",
    author: { login: "ana" }, createdAt: "2026-01-01T00:00:00Z", body: "It breaks.",
    timelineItems: { totalCount: nodes.length, nodes }, ...extra,
  };
}

test("splits the timeline at the baseline and counts what others did after it", () => {
  const v = digest(issue([
    comment("c1", "bob", "2026-01-02T00:00:00Z"),
    comment("c2", "bob", "2026-01-04T00:00:00Z"),
    comment("c3", "me", "2026-01-05T00:00:00Z"),
    { __typename: "ClosedEvent", id: "e1", actor: { login: "bob" }, createdAt: "2026-01-06T00:00:00Z" },
  ]), "2026-01-03T00:00:00Z", "me");

  assert.deepEqual(v.olderItems.map((i) => i.id), ["c1"]);
  assert.deepEqual(v.newItems.map((i) => i.id), ["c2", "c3", "e1"]);
  assert.equal(v.descriptionIsNew, false);
  assert.equal(v.newCount, 2);
  assert.deepEqual(v.summary, { comments: 1, reviews: [], commits: 0, events: ["closed"] });
});

test("without a baseline everything, the description included, is new", () => {
  const v = digest(issue([comment("c1", "bob", "2026-01-02T00:00:00Z")]), null, "me");
  assert.equal(v.olderItems.length, 0);
  assert.equal(v.descriptionIsNew, true);
  assert.equal(v.newCount, 2);
});

test("folds a run of commits and of label changes by one person into one item each", () => {
  const v = digest({
    ...issue([
      commit("k1", "bob", "2026-01-02T00:00:00Z", "first"),
      commit("k2", "bob", "2026-01-02T01:00:00Z", "second"),
      label("LabeledEvent", "l1", "bob", "2026-01-02T02:00:00Z", "bug"),
      label("LabeledEvent", "l2", "bob", "2026-01-02T03:00:00Z", "p1"),
      label("UnlabeledEvent", "l3", "bob", "2026-01-02T04:00:00Z", "bug"),
    ]),
    __typename: "PullRequest", state: "OPEN", isDraft: false,
  }, "2026-01-01T12:00:00Z", "me");

  assert.equal(v.kind, "pr");
  assert.deepEqual(v.newItems.map((i) => i.kind), ["commits", "labels"]);
  assert.deepEqual(v.newItems[0].commits, ["first", "second"]);
  assert.deepEqual(v.newItems[1].added, ["p1"]);
  assert.deepEqual(v.newItems[1].removed, ["bug"]);
  assert.equal(v.summary.commits, 2);
});

test("shows reactions with counts and marks your own", () => {
  const v = digest(issue([comment("c1", "bob", "2026-01-02T00:00:00Z", {
    reactionGroups: [
      { content: "THUMBS_UP", viewerHasReacted: true, reactors: { totalCount: 3 } },
      { content: "HEART", viewerHasReacted: false, reactors: { totalCount: 0 } },
    ],
  })]), null, "me");
  assert.deepEqual(v.newItems[0].reactions, [{ content: "THUMBS_UP", emoji: "👍", count: 3, mine: true }]);
});

test("counts the history GitHub has beyond what was fetched", () => {
  const v = digest(issue([comment("c1", "bob", "2026-01-02T00:00:00Z")], { timelineItems: { totalCount: 140, nodes: [comment("c1", "bob", "2026-01-02T00:00:00Z")] } }), null, "me");
  assert.equal(v.olderOnGitHub, 139);
});

test("the baseline is the later of GitHub's read time and the inbox's own", () => {
  assert.equal(baseline("2026-01-02T00:00:00Z", "2026-01-03T00:00:00Z"), "2026-01-03T00:00:00Z");
  assert.equal(baseline("2026-01-04T00:00:00Z", "2026-01-03T00:00:00Z"), "2026-01-04T00:00:00Z");
  assert.equal(baseline(null, "2026-01-03T00:00:00Z"), "2026-01-03T00:00:00Z");
  assert.equal(baseline("2026-01-02T00:00:00Z", undefined), "2026-01-02T00:00:00Z");
  assert.equal(baseline(null, null), null);
});
