// The Zero dialog's lists as plain data, and the changes the dialog makes to
// them before Zero answers. State is { today, tasks, home, projects }: tasks
// holds every open Task, home the ids on Zero's Home in Home order. Each change
// returns the new state and the change that undoes it, so a write Zero refuses
// can be rolled back without touching changes made since.

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const iso = (d) => d.toISOString().slice(0, 10);

function addDays(date, days) {
  const [, y, m, d] = date.match(DATE);
  return iso(new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + days)));
}

// Reads what the schedule box accepts: YYYY-MM-DD, +N days, today, tomorrow,
// or nothing to make the Task current every day.
export function parseSchedule(text, today) {
  const s = text.trim().toLowerCase();
  if (!s) return { date: null };
  if (s === "today") return { date: today };
  if (s === "tomorrow") return { date: addDays(today, 1) };
  const plus = s.match(/^\+(\d+)$/);
  if (plus) return { date: addDays(today, Number(plus[1])) };
  if (DATE.test(s) && addDays(s, 0) === s) return { date: s };
  return { error: `Can't read “${text.trim()}”: use YYYY-MM-DD, +N, tomorrow, or nothing to clear` };
}

export function fromLists({ today, all, home, projects }) {
  const ids = new Set(all.map((t) => t.id));
  return {
    today,
    tasks: [...all, ...home.filter((t) => !ids.has(t.id))],
    home: home.map((t) => t.id),
    projects,
  };
}

export const projectIdOf = (task) => (task.parent?.kind === "project" ? task.parent.projectId : null);

export const isFuture = (state, task) => Boolean(task.showUpDate && task.showUpDate > state.today);

export function todayRows(state) {
  const byId = new Map(state.tasks.map((t) => [t.id, t]));
  return state.home.map((id) => byId.get(id)).filter(Boolean);
}

export const STATE_TITLES = { "in-play": "In play", backlog: "Backlog", done: "Done" };

export function projectRows(state, { showDone = false } = {}) {
  return Object.entries(STATE_TITLES).filter(([key]) => showDone || key !== "done").flatMap(([key, title]) => {
    const projects = state.projects.filter((p) => p.state === key);
    return projects.length ? [{ kind: "section", title }, ...projects.map((project) => ({ kind: "project", project }))] : [];
  });
}

export const projectTasks = (state, id) => state.tasks.filter((t) => projectIdOf(t) === id);

const NOOP = { type: "noop" };

const insert = (list, at, item) => [...list.slice(0, at), item, ...list.slice(at)];

function placeInHome(home, id, at) {
  const rest = home.filter((x) => x !== id);
  return at < 0 ? rest : insert(rest, Math.min(at, rest.length), id);
}

const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k]]));

// Applies one change. Returns { state, inverse }.
export function applyChange(state, change) {
  const taskAt = state.tasks.findIndex((t) => t.id === change.id);
  const projectAt = state.projects.findIndex((p) => p.id === change.id);
  const unchanged = { state, inverse: NOOP };
  switch (change.type) {
    case "noop":
      return unchanged;
    case "addTask": {
      const { task, at = state.tasks.length, homeAt = -1 } = change;
      return {
        state: { ...state, tasks: insert(state.tasks, at, task), home: placeInHome(state.home, task.id, homeAt) },
        inverse: { type: "removeTask", id: task.id },
      };
    }
    case "removeTask": {
      if (taskAt < 0) return unchanged;
      return {
        state: { ...state, tasks: state.tasks.filter((t) => t.id !== change.id), home: state.home.filter((x) => x !== change.id) },
        inverse: { type: "addTask", task: state.tasks[taskAt], at: taskAt, homeAt: state.home.indexOf(change.id) },
      };
    }
    case "updateTask": {
      if (taskAt < 0) return unchanged;
      const old = state.tasks[taskAt];
      const task = { ...old, ...change.patch };
      const homeAt = change.homeAt ?? (isFuture(state, task) ? -1 : state.home.indexOf(old.id));
      return {
        state: { ...state, tasks: state.tasks.map((t, i) => (i === taskAt ? task : t)), home: placeInHome(state.home, old.id, homeAt) },
        inverse: { type: "updateTask", id: old.id, patch: pick(old, Object.keys(change.patch)), homeAt: state.home.indexOf(old.id) },
      };
    }
    case "replaceTask": {
      if (taskAt < 0) return unchanged;
      const old = state.tasks[taskAt];
      return {
        state: {
          ...state,
          tasks: state.tasks.map((t, i) => (i === taskAt ? change.task : t)),
          home: state.home.map((x) => (x === old.id ? change.task.id : x)),
        },
        inverse: { type: "replaceTask", id: change.task.id, task: old },
      };
    }
    case "addProject": {
      const { project, at = state.projects.length, tasks = [] } = change;
      let next = { ...state, projects: insert(state.projects, at, project) };
      for (const t of [...tasks].sort((a, b) => a.at - b.at)) next = { ...next, tasks: insert(next.tasks, t.at, t.task) };
      for (const t of tasks.filter((t) => t.homeAt >= 0).sort((a, b) => a.homeAt - b.homeAt)) {
        next = { ...next, home: insert(next.home, t.homeAt, t.task.id) };
      }
      return { state: next, inverse: { type: "removeProject", id: project.id } };
    }
    case "removeProject": {
      if (projectAt < 0) return unchanged;
      const gone = state.tasks.map((task, at) => ({ task, at, homeAt: state.home.indexOf(task.id) }))
        .filter(({ task }) => projectIdOf(task) === change.id);
      const ids = new Set(gone.map((g) => g.task.id));
      return {
        state: {
          ...state,
          projects: state.projects.filter((p) => p.id !== change.id),
          tasks: state.tasks.filter((t) => !ids.has(t.id)),
          home: state.home.filter((x) => !ids.has(x)),
        },
        inverse: { type: "addProject", project: state.projects[projectAt], at: projectAt, tasks: gone },
      };
    }
    case "updateProject": {
      if (projectAt < 0) return unchanged;
      const old = state.projects[projectAt];
      return {
        state: { ...state, projects: state.projects.map((p, i) => (i === projectAt ? { ...old, ...change.patch } : p)) },
        inverse: { type: "updateProject", id: old.id, patch: pick(old, Object.keys(change.patch)) },
      };
    }
    case "replaceProject": {
      if (projectAt < 0) return unchanged;
      const old = state.projects[projectAt];
      return {
        state: { ...state, projects: state.projects.map((p, i) => (i === projectAt ? change.project : p)) },
        inverse: { type: "replaceProject", id: change.project.id, project: old },
      };
    }
    default:
      throw new Error(`unknown change ${change.type}`);
  }
}
