import { test } from "node:test";
import assert from "node:assert/strict";
import { currentDir, currentRepo, declaredRepos, focusedLabels, sessionDirs } from "./repos.js";

// Stands in for Herdr's exec: only these repos are cloned, under /h/workspace.
const cloned = (...repos) => async (_cmd, args) => (repos.includes(args[3]) ? { code: 0, stdout: `/h/workspace/${args[3]}\n` } : { code: 1, stdout: "" });

test("reads the declared repos in order, ignoring blanks and spaces", () => {
  assert.deepEqual(declaredRepos({ repos: "a/b, c/d,,e/f " }), ["a/b", "c/d", "e/f"]);
  assert.deepEqual(declaredRepos({}), []);
  assert.deepEqual(declaredRepos(undefined), []);
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
