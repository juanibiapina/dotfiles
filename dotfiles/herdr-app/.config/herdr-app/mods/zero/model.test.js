import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSchedule, fromLists, todayRows, projectRows, projectTasks, applyChange } from "./model.js";

const task = (id, more = {}) => ({
  id, text: `task ${id}`, showUpDate: null, recurrence: null, recurrenceDate: null, parent: null,
  recordingId: null, createdAt: "2026-11-01T00:00:00Z", completedAt: null, ...more,
});
const project = (id, more = {}) => ({
  id, title: `project ${id}`, icon: "📁", description: null, state: "in-play", attention: "active",
  createdAt: "2026-11-01T00:00:00Z", ...more,
});
const inProject = (projectId) => ({ parent: { kind: "project", projectId } });

const state = () => fromLists({
  today: "2026-11-17",
  all: [task("a"), task("b", inProject("p1")), task("c", { showUpDate: "2026-11-20" }), task("d", inProject("p2"))],
  home: [task("b", inProject("p1")), task("a")],
  projects: [project("p1"), project("p2", { state: "backlog" }), project("p3", { state: "done" }), project("p4")],
});

test("parseSchedule reads dates, days from today, tomorrow and empty", () => {
  assert.deepEqual(parseSchedule("2026-12-01", "2026-11-17"), { date: "2026-12-01" });
  assert.deepEqual(parseSchedule("+3", "2026-11-17"), { date: "2026-11-20" });
  assert.deepEqual(parseSchedule("+20", "2026-11-17"), { date: "2026-12-07" });
  assert.deepEqual(parseSchedule(" tomorrow ", "2026-12-31"), { date: "2027-01-01" });
  assert.deepEqual(parseSchedule("today", "2026-11-17"), { date: "2026-11-17" });
  assert.deepEqual(parseSchedule("", "2026-11-17"), { date: null });
});

test("parseSchedule refuses anything else", () => {
  for (const text of ["next week", "2026-13-01", "2026-02-30", "+x", "17/11"]) {
    assert.ok(parseSchedule(text, "2026-11-17").error, text);
  }
});

test("Today lists the Home Tasks in Home order", () => {
  assert.deepEqual(todayRows(state()).map((t) => t.id), ["b", "a"]);
});

test("Projects groups in play, then backlog, and done ones only when asked", () => {
  const ids = (rows) => rows.map((r) => (r.kind === "section" ? `#${r.title}` : r.project.id));
  assert.deepEqual(ids(projectRows(state())), ["#In play", "p1", "p4", "#Backlog", "p2"]);
  assert.deepEqual(ids(projectRows(state(), { showDone: true })), ["#In play", "p1", "p4", "#Backlog", "p2", "#Done", "p3"]);
  assert.deepEqual(projectTasks(state(), "p1").map((t) => t.id), ["b"]);
});

test("a Task scheduled in the future leaves Today, and its inverse brings it back", () => {
  const before = state();
  const { state: after, inverse } = applyChange(before, { type: "updateTask", id: "b", patch: { showUpDate: "2026-11-25" } });
  assert.deepEqual(todayRows(after).map((t) => t.id), ["a"]);
  assert.equal(after.tasks.find((t) => t.id === "b").showUpDate, "2026-11-25");
  assert.deepEqual(applyChange(after, inverse).state, before);
});

const changes = [
  ["adding a Task", { type: "addTask", task: task("new"), homeAt: 0 }],
  ["completing a Task", { type: "removeTask", id: "b" }],
  ["renaming a Task", { type: "updateTask", id: "a", patch: { text: "renamed" } }],
  ["moving a Task out of its Project", { type: "updateTask", id: "b", patch: { parent: null } }],
  ["clearing a Task's date", { type: "updateTask", id: "c", patch: { showUpDate: null } }],
  ["replacing a pending Task", { type: "replaceTask", id: "a", task: task("real") }],
  ["adding a Project", { type: "addProject", project: project("new") }],
  ["parking a Project", { type: "updateProject", id: "p1", patch: { state: "backlog" } }],
  ["deleting a Project with its Tasks", { type: "removeProject", id: "p1" }],
  ["replacing a pending Project", { type: "replaceProject", id: "p4", project: project("real") }],
];

for (const [name, change] of changes) {
  test(`${name} changes the lists, and its inverse restores them`, () => {
    const before = state();
    const { state: after, inverse } = applyChange(before, change);
    assert.notDeepEqual(after, before);
    assert.deepEqual(applyChange(after, inverse).state, before);
  });
}

test("deleting a Project removes its Tasks from every list", () => {
  const { state: after } = applyChange(state(), { type: "removeProject", id: "p1" });
  assert.equal(after.projects.some((p) => p.id === "p1"), false);
  assert.deepEqual(todayRows(after).map((t) => t.id), ["a"]);
  assert.deepEqual(after.tasks.map((t) => t.id), ["a", "c", "d"]);
});

test("a change to a missing item leaves the lists as they are", () => {
  const before = state();
  const { state: after, inverse } = applyChange(before, { type: "removeTask", id: "nope" });
  assert.deepEqual(after, before);
  assert.deepEqual(applyChange(after, inverse).state, before);
});
