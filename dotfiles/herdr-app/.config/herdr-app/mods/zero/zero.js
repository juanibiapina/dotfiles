// Everything the Zero dialog asks of Zero, through the zero-todo CLI on this
// Mac. It runs under zsh, as the mail mod runs gog, so it finds zero-todo on
// the PATH a shell has. Calls go through one queue, so writes reach Zero in the
// order the keys were pressed and a refresh never reads half of them.

import { exec } from "herdr";

async function run(args) {
  const r = await exec("zsh", ["-c", 'exec zero-todo "$@"', "zsh", ...args, "--json"], { timeout: 60_000 });
  if (r.code !== 0) {
    const text = (r.stderr || r.stdout).trim().replace(/^Error:\s*/, "").split("\n").filter(Boolean).join(" · ");
    throw new Error(text || `zero-todo ${args.slice(0, 2).join(" ")} failed`);
  }
  return JSON.parse(r.stdout);
}

let tail = Promise.resolve();
let waiting = 0;

function queued(fn) {
  waiting++;
  const next = tail.then(fn).finally(() => waiting--);
  tail = next.catch(() => {});
  return next;
}

// Calls still waiting in the queue, the one running included.
export const pending = () => waiting;

export const enqueue = queued;

export async function lists() {
  const [all, home, projects] = await Promise.all([
    run(["tasks", "list"]),
    run(["tasks", "list", "--home"]),
    run(["projects", "list", "--all"]),
  ]);
  return { today: home.today, all: all.tasks, home: home.tasks, projects: projects.projects };
}

const dateArgs = (date) => (date ? ["--on", date] : ["--no-date"]);
const projectArgs = (projectId) => (projectId ? ["--project", projectId] : ["--loose"]);

export const addTask = (text, { projectId = null, date = null } = {}) =>
  queued(() => run(["tasks", "add", text, ...(projectId ? ["--project", projectId] : []), ...(date ? ["--on", date] : [])]));
export const renameTask = (id, text) => queued(() => run(["tasks", "edit", id, "--text", text]));
export const scheduleTask = (id, date) => queued(() => run(["tasks", "edit", id, ...dateArgs(date)]));
export const moveTask = (id, projectId) => queued(() => run(["tasks", "edit", id, ...projectArgs(projectId)]));
export const completeTask = (id) => queued(() => run(["tasks", "done", id]));
export const reopenTask = (id) => queued(() => run(["tasks", "reopen", id]));

export const addProject = (title, { backlog = false } = {}) =>
  queued(() => run(["projects", "add", title, ...(backlog ? ["--backlog"] : [])]));
export const renameProject = (id, title) => queued(() => run(["projects", "edit", id, "--title", title]));
export const setProjectState = (id, state) => queued(() => run(["projects", "state", id, state]));
export const deleteProject = (id) => queued(() => run(["projects", "delete", id, "--yes"]));
