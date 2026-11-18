import { test } from "node:test";
import assert from "node:assert/strict";
import { fromLists, issueRows, applyChange, labelToggle, matches } from "./model.js";

const st = (id, name, type, position) => ({ id, name, type, position, color: "#888" });
const issue = (id, stateId, extra = {}) => ({
  id, identifier: `GB-${id}`, title: `Issue ${id}`, url: `https://linear.app/x/GB-${id}`, priority: 0,
  updatedAt: `2026-11-${String(30 - Number(id)).padStart(2, "0")}T00:00:00Z`, createdAt: "2026-11-01T00:00:00Z",
  labelIds: [], state: { id: stateId }, assignee: null, creator: { name: "Kiril" }, project: null,
  projectMilestone: null, parent: null, ...extra,
});

const lists = () => ({
  viewer: { id: "me", name: "Juan Ibiapina", organization: { urlKey: "gitbutler" } },
  teams: [{
    id: "gb", key: "GB", name: "GitButler Internal", states: { nodes: [
      st("backlog", "Backlog", "backlog", 0), st("planned", "Planned", "unstarted", 0),
      st("review", "In Review", "started", 2), st("progress", "In Progress", "started", 1),
      st("triage", "Triage", "triage", 0), st("done", "Done", "completed", 0),
    ] },
  }],
  labels: [
    { id: "bug", name: "bug", color: "#f00", isGroup: false, parent: null },
    { id: "ui", name: "ui", color: "#0f0", isGroup: false, parent: null },
    { id: "features", name: "FEATURES", color: "#00f", isGroup: true, parent: null },
    { id: "f-cli", name: "CLI", color: "#00f", isGroup: false, parent: { id: "features", name: "FEATURES", groupType: "singleSelect" } },
    { id: "f-tui", name: "TUI", color: "#00f", isGroup: false, parent: { id: "features", name: "FEATURES", groupType: "singleSelect" } },
  ],
  issues: [
    issue("1", "backlog", { labelIds: ["bug", "f-cli"] }),
    issue("2", "progress", { assignee: { id: "me", name: "Juan Ibiapina", displayName: "juan" } }),
    issue("3", "backlog"),
    issue("4", "review"),
    issue("5", "triage"),
  ],
  projects: [],
  notifications: [],
});

const sections = (rows) => rows.filter((r) => r.kind === "section").map((r) => [r.title, r.count]);
const ids = (rows) => rows.filter((r) => r.kind === "issue").map((r) => r.issue.id);

test("issues sit under their status in workflow order, each with its count", () => {
  const rows = issueRows(fromLists(lists()));
  assert.deepEqual(sections(rows), [["Triage", 1], ["In Progress", 1], ["In Review", 1], ["Backlog", 2]]);
  assert.deepEqual(ids(rows), ["5", "2", "4", "1", "3"]);
});

test("setting a completed status takes the issue out, and the inverse puts it back in place", () => {
  const state = fromLists(lists());
  const { state: done, inverse } = applyChange(state, { type: "updateIssue", id: "3", patch: { stateId: "done" } });
  assert.ok(!done.issues.some((i) => i.id === "3"));
  assert.deepEqual(applyChange(done, inverse).state.issues, state.issues);
});

test("toggling a label and undoing it leaves the issue's other labels alone", () => {
  const state = fromLists(lists());
  const one = state.issues.find((i) => i.id === "1");
  const on = applyChange(state, { type: "labels", id: "1", ...labelToggle(state, one, "ui") });
  assert.deepEqual(on.state.issues.find((i) => i.id === "1").labelIds, ["bug", "f-cli", "ui"]);
  const off = applyChange(on.state, { type: "labels", id: "1", ...labelToggle(on.state, on.state.issues.find((i) => i.id === "1"), "bug") });
  assert.deepEqual(off.state.issues.find((i) => i.id === "1").labelIds, ["f-cli", "ui"]);
  assert.deepEqual(applyChange(off.state, off.inverse).state.issues.find((i) => i.id === "1").labelIds.sort(), ["bug", "f-cli", "ui"]);
});

test("a label from a single-select group replaces its sibling, and the inverse restores it", () => {
  const state = fromLists(lists());
  const one = state.issues.find((i) => i.id === "1");
  const { state: next, inverse } = applyChange(state, { type: "labels", id: "1", ...labelToggle(state, one, "f-tui") });
  assert.deepEqual(next.issues.find((i) => i.id === "1").labelIds, ["bug", "f-tui"]);
  assert.deepEqual(applyChange(next, inverse).state.issues.find((i) => i.id === "1").labelIds.sort(), ["bug", "f-cli"]);
});

test("the filter finds an issue by assignee and by identifier", () => {
  const state = fromLists(lists());
  assert.deepEqual(ids(issueRows(state, { query: "juan" })), ["2"]);
  assert.deepEqual(ids(issueRows(state, { query: "gb-4" })), ["4"]);
});
