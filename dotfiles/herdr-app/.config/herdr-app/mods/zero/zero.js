// Everything the Zero dialog asks of Zero, through the zero-todo CLI on this
// Mac. It runs under zsh, as the mail mod runs gog, so it finds zero-todo on
// the PATH a shell has. Calls go through one queue, so writes reach Zero in the
// order the keys were pressed and a refresh never reads half of them.
//
// Each dialog makes its own client in init. Module scope outlives the dialog,
// and closing it cancels a call in flight, which would leave a shared queue
// waiting forever.

import { exec } from "herdr";

async function run(args) {
  const r = await exec("zsh", ["-c", 'exec zero-todo "$@"', "zsh", ...args, "--json"], { timeout: 60_000 });
  if (r.code !== 0) {
    const text = (r.stderr || r.stdout).trim().replace(/^Error:\s*/, "").split("\n").filter(Boolean).join(" · ");
    throw new Error(text || `zero-todo ${args.slice(0, 2).join(" ")} failed`);
  }
  return JSON.parse(r.stdout);
}

export function createZero() {
  let tail = Promise.resolve();
  let waiting = 0;

  function enqueue(fn) {
    waiting++;
    const next = tail.then(fn).finally(() => waiting--);
    tail = next.catch(() => {});
    return next;
  }

  const write = (args) => enqueue(() => run(args));

  return {
    enqueue,
    // Calls still waiting in the queue, the one running included.
    pending: () => waiting,

    async lists() {
      const [all, home, projects] = await Promise.all([
        run(["tasks", "list"]),
        run(["tasks", "list", "--home"]),
        run(["projects", "list", "--all"]),
      ]);
      return { today: home.today, all: all.tasks, home: home.tasks, projects: projects.projects };
    },

    addTask: (text, projectId) => write(["tasks", "add", text, ...(projectId ? ["--project", projectId] : [])]),
    renameTask: (id, text) => write(["tasks", "edit", id, "--text", text]),
    scheduleTask: (id, date) => write(["tasks", "edit", id, ...(date ? ["--on", date] : ["--no-date"])]),
    moveTask: (id, projectId) => write(["tasks", "edit", id, ...(projectId ? ["--project", projectId] : ["--loose"])]),
    completeTask: (id) => write(["tasks", "done", id]),
    reopenTask: (id) => write(["tasks", "reopen", id]),

    addProject: (title) => write(["projects", "add", title]),
    renameProject: (id, title) => write(["projects", "edit", id, "--title", title]),
    setProjectState: (id, state) => write(["projects", "state", id, state]),
    deleteProject: (id) => write(["projects", "delete", id, "--yes"]),
  };
}
