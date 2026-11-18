import { test } from "node:test";
import assert from "node:assert/strict";
import { currentDir, currentRepo, declaredRepos, focusedLabels, groupSessions, sessionDirs } from "./repos.js";

// Stands in for Herdr's exec: only these repos are cloned, under /h/workspace.
const cloned = (...repos) => async (_cmd, args) => (repos.includes(args[3]) ? { code: 0, stdout: `/h/workspace/${args[3]}\n` } : { code: 1, stdout: "" });

test("reads the declared repos in order, ignoring blanks and spaces", () => {
  assert.deepEqual(declaredRepos({ repos: "a/b, c/d,,e/f " }), ["a/b", "c/d", "e/f"]);
  assert.deepEqual(declaredRepos({}), []);
  assert.deepEqual(declaredRepos(undefined), []);
});

test("a session that wrote nothing is about its last related repo", () => {
  assert.deepEqual(declaredRepos({ related: "a/b,c/d" }), ["c/d"]);
  assert.deepEqual(declaredRepos({ repos: "", related: "a/b" }), ["a/b"]);
  assert.equal(currentRepo({ related: "a/b,c/d" }), "c/d");
});

test("written repos win over related ones", () => {
  assert.deepEqual(declaredRepos({ repos: "a/b", related: "c/d" }), ["a/b"]);
  assert.equal(currentRepo({ repos: "a/b", related: "c/d" }), "a/b");
});

test("the current repo is the last one declared", () => {
  assert.equal(currentRepo({ repos: "a/b,c/d" }), "c/d");
  assert.equal(currentRepo({}), null);
});

test("a focused shell beside pi takes pi's repos", () => {
  const agents = [{ address: "t2", tab: "tab", app: "pi" }];
  const terminals = [{ address: "t1", labels: {} }, { address: "t2", labels: { repos: "a/b" } }];
  assert.deepEqual(focusedLabels({ terminal: "t1", tab: "tab" }, agents, terminals), { repos: "a/b" });
  assert.deepEqual(focusedLabels({ terminal: "t2", tab: "tab" }, agents, terminals), { repos: "a/b" });
  assert.deepEqual(focusedLabels({ terminal: "t1", tab: "other" }, agents, terminals), {});
  assert.deepEqual(focusedLabels(null, agents, terminals), {});
});

test("a focused terminal with only related repos keeps its own labels", () => {
  const agents = [{ address: "t2", tab: "tab", app: "pi" }];
  const terminals = [{ address: "t1", labels: { related: "c/d" } }, { address: "t2", labels: { repos: "a/b" } }];
  assert.deepEqual(focusedLabels({ terminal: "t1", tab: "tab" }, agents, terminals), { related: "c/d" });
});

// The groups as [name, [addresses]] for short assertions.
const shape = (groups) => groups.map((g) => [g.kind === "space" ? g.space.id : `${g.repo}${g.machine ? `@${g.machine}` : ""}`, g.agents.map((a) => a.address)]);

test("labelled sessions leave their space for their current repo; the rest stay", () => {
  const spaceList = [{ id: "home" }, { id: "dots" }];
  const agentList = [
    { address: "t1", space: "home" },
    { address: "t2", space: "home" },
    { address: "t3", space: "dots" },
    { address: "t4", space: "dots" },
  ];
  const terminalList = [
    { address: "t1", labels: {} },
    { address: "t2", labels: { repos: "a/x,o/r" } },
    { address: "t3", labels: { repos: "o/r" } },
    { address: "t4", labels: { repos: "b/b" } },
  ];
  assert.deepEqual(shape(groupSessions(spaceList, agentList, terminalList, new Map())),
    [["home", ["t1"]], ["dots", []], ["b/b", ["t4"]], ["o/r", ["t2", "t3"]]]);
});

test("a session that only read a repo is grouped under it", () => {
  const agentList = [{ address: "t1", space: "s" }, { address: "t2", space: "s" }];
  const terminalList = [{ address: "t1", labels: { related: "a/x,o/r" } }, { address: "t2", labels: {} }];
  assert.deepEqual(shape(groupSessions([{ id: "s" }], agentList, terminalList, new Map())),
    [["s", ["t2"]], ["o/r", ["t1"]]]);
});

test("child sessions follow their top-level parent, whatever they declared", () => {
  const terminalList = [
    { address: "p", labels: { repos: "o/r" } },
    { address: "c", parent: "p", labels: { repos: "x/y" } },
    { address: "g", parent: "c", labels: {} },
    { address: "u", labels: {} },
    { address: "k", parent: "u", labels: { repos: "x/y" } },
  ];
  const agentList = ["p", "c", "g", "u", "k"].map((address) => ({ address, space: "s" }));
  assert.deepEqual(shape(groupSessions([{ id: "s" }], agentList, terminalList, new Map())),
    [["s", ["u", "k"]], ["o/r", ["p", "c", "g"]]]);
});

test("each machine gets its own repo group, this one first", () => {
  const terminalList = [{ address: "mini/t1", labels: { repos: "o/r" } }, { address: "t2", labels: { repos: "o/r" } }];
  const agentList = [{ address: "mini/t1", space: "mini/s" }, { address: "t2", space: "s" }];
  const machineOf = new Map([["mini/s", "mini"], ["s", null]]);
  assert.deepEqual(shape(groupSessions([{ id: "s" }, { id: "mini/s" }], agentList, terminalList, machineOf)),
    [["s", []], ["mini/s", []], ["o/r", ["t2"]], ["o/r@mini", ["mini/t1"]]]);
});

test("sessions of spaces the caller left out stay out, labelled or not", () => {
  const agentList = [{ address: "t1", space: "factory-x" }, { address: "t2", space: "s" }];
  const terminalList = [{ address: "t1", labels: { repos: "o/r" } }, { address: "t2", labels: {} }];
  assert.deepEqual(shape(groupSessions([{ id: "s" }], agentList, terminalList, new Map())), [["s", ["t2"]]]);
});

test("a labelled session is about its cloned repos, an unlabelled one about its folder", async () => {
  assert.deepEqual(await sessionDirs({ labels: { repos: "a/b,x/y,c/d" }, cwd: "/h/home" }, cloned("a/b", "c/d")),
    [{ repo: "a/b", dir: "/h/workspace/a/b" }, { repo: "c/d", dir: "/h/workspace/c/d" }]);
  assert.deepEqual(await sessionDirs({ labels: {}, cwd: "/h/home" }, cloned()), [{ repo: null, dir: "/h/home" }]);
});

test("one-repo tools work in the current repo, else the folder", async () => {
  assert.equal(await currentDir({ labels: { repos: "a/b,c/d" }, cwd: "/h/home" }, cloned("a/b", "c/d")), "/h/workspace/c/d");
  assert.equal(await currentDir({ labels: { repos: "x/y" }, cwd: "/h/home" }, cloned()), "/h/home");
  assert.equal(await currentDir({ labels: {}, cwd: "/h/home" }, cloned()), "/h/home");
});
