// The Linear dialog's lists as plain data, and the changes the dialog makes to
// them before Linear answers. Each change returns the new state and the change
// that undoes it, so a write Linear refuses can be rolled back without touching
// changes made since. This file imports nothing from "herdr", so node can load it.

/** @typedef {{ id, identifier, title, url, priority, updatedAt, stateId, assignee, creator, projectId, milestone, parent, labelIds }} Issue */
/** @typedef {{ id, name, type, position, color }} State */
/** @typedef {{ id, name, color, isGroup, parentId, parentName, single }} Label */
/** @typedef {{ viewer, teams: { id, key }[], states: State[], labels: Label[], issues: Issue[], projects, notifications }} LinearState */

export const OPEN_TYPES = ["triage", "started", "unstarted", "backlog"];
const CLOSED_TYPES = ["completed", "canceled", "duplicate"];
const FLOW = ["triage", "backlog", "unstarted", "started", "completed"];
const PICK_ORDER = ["triage", "backlog", "unstarted", "started", "completed", "canceled", "duplicate"];
export const PROJECT_TYPES = [
  ["started", "In Progress"], ["paused", "Paused"], ["planned", "Planned"], ["backlog", "Backlog"],
  ["completed", "Completed"], ["canceled", "Canceled"],
];
const DONE_PROJECT = ["completed", "canceled"];
export const PRIORITY = ["", "Urgent", "High", "Medium", "Low"];

export function issueOf(n) {
  return {
    id: n.id, identifier: n.identifier, title: n.title, url: n.url, priority: n.priority ?? 0,
    updatedAt: n.updatedAt, createdAt: n.createdAt, stateId: n.state?.id ?? null,
    assignee: n.assignee ? { id: n.assignee.id, name: n.assignee.name, handle: n.assignee.displayName } : null,
    creator: n.creator?.name ?? null, projectId: n.project?.id ?? null, milestone: n.projectMilestone?.name ?? null,
    parent: n.parent?.identifier ?? null, labelIds: n.labelIds ?? [],
  };
}

const notificationOf = (n) => ({
  id: n.id, type: n.type, category: n.category, readAt: n.readAt, createdAt: n.createdAt,
  title: n.title ?? null, subtitle: n.subtitle ?? null, url: n.url ?? n.issue?.url ?? null, actor: n.actor?.name ?? null,
  issueId: n.issue?.id ?? null,
  issue: n.issue ? { identifier: n.issue.identifier, title: n.issue.title, url: n.issue.url } : null,
});

const projectOf = (p) => ({
  id: p.id, name: p.name, url: p.url, description: p.description ?? "", targetDate: p.targetDate ?? null,
  progress: p.progress ?? 0, status: p.status ?? { name: "Backlog", type: "backlog" }, lead: p.lead?.name ?? null,
  milestones: p.projectMilestones?.nodes ?? [],
});

const byDate = (key) => (a, b) => (b[key] ?? "").localeCompare(a[key] ?? "");

/** @returns {LinearState} */
export function fromLists(lists) {
  return {
    viewer: { id: lists.viewer.id, name: lists.viewer.name, urlKey: lists.viewer.organization?.urlKey ?? null },
    teams: lists.teams.map((t) => ({ id: t.id, key: t.key, name: t.name })),
    states: lists.teams.flatMap((t) => t.states.nodes.map((s) => ({ ...s, teamId: t.id }))),
    labels: lists.labels.map((l) => ({
      id: l.id, name: l.name, color: l.color, isGroup: l.isGroup, parentId: l.parent?.id ?? null,
      parentName: l.parent?.name ?? null, single: l.parent?.groupType === "singleSelect",
    })),
    issues: lists.issues.map(issueOf).sort(byDate("updatedAt")),
    projects: lists.projects.map(projectOf),
    notifications: lists.notifications.map(notificationOf).sort(byDate("createdAt")),
  };
}

export const stateOf = (state, id) => state.states.find((s) => s.id === id) ?? null;
export const labelOf = (state, id) => state.labels.find((l) => l.id === id) ?? null;
export const projectById = (state, id) => (id ? state.projects.find((p) => p.id === id) ?? null : null);
export const labelName = (l) => (l.parentName ? `${l.parentName} › ${l.name}` : l.name);
export const isOpen = (s) => Boolean(s && OPEN_TYPES.includes(s.type));

const rank = (order, s) => order.indexOf(s.type) * 1000 + s.position;
const ordered = (order, states) => states.filter((s) => order.includes(s.type)).sort((a, b) => rank(order, a) - rank(order, b));

// The team's states in the order issues move through them.
export const workflow = (state) => ordered(FLOW, state.states);
// Every state, for the status picker.
export const pickStates = (state) => ordered(PICK_ORDER, state.states);

// The words a filter matches against.
function words(state, item) {
  if (item.identifier !== undefined) {
    return [
      item.identifier, item.title, item.assignee?.name, item.assignee?.handle, projectById(state, item.projectId)?.name,
      stateOf(state, item.stateId)?.name, ...item.labelIds.map((id) => labelOf(state, id)?.name),
    ];
  }
  if (item.type !== undefined) return [item.title, item.subtitle, item.actor, item.issue?.identifier, item.issue?.title, item.type];
  return [item.name, item.lead, item.status?.name];
}

// Whether every word of the query appears in the item.
export function matches(state, item, query) {
  const q = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!q.length) return true;
  const text = words(state, item).filter(Boolean).join(" ").toLowerCase();
  return q.every((w) => text.includes(w));
}

// Open issues under their status, in workflow order, newest change first.
export function issueRows(state, { projectId = null, query = "" } = {}) {
  const issues = state.issues.filter((i) => (!projectId || i.projectId === projectId) && matches(state, i, query));
  return ordered(OPEN_TYPES, state.states).flatMap((s) => {
    const mine = issues.filter((i) => i.stateId === s.id);
    return mine.length ? [{ kind: "section", title: s.name, count: mine.length, color: s.color }, ...mine.map((issue) => ({ kind: "issue", issue }))] : [];
  });
}

export const openCount = (state, projectId) => state.issues.filter((i) => i.projectId === projectId).length;

export function projectRows(state, { showDone = false, query = "" } = {}) {
  return PROJECT_TYPES.filter(([type]) => showDone || !DONE_PROJECT.includes(type)).flatMap(([type, title]) => {
    const projects = state.projects.filter((p) => p.status.type === type && matches(state, p, query))
      .sort((a, b) => a.name.localeCompare(b.name));
    return projects.length ? [{ kind: "section", title, count: projects.length }, ...projects.map((project) => ({ kind: "project", project }))] : [];
  });
}

export const isDoneProject = (p) => DONE_PROJECT.includes(p.status.type);

export function inboxRows(state, { query = "" } = {}) {
  return state.notifications.filter((n) => matches(state, n, query)).map((notification) => ({ kind: "notification", notification }));
}

// The labels to add and remove when one label is toggled on an issue. Adding a
// label from a single-select group removes the issue's other labels from it.
export function labelToggle(state, issue, labelId) {
  if (issue.labelIds.includes(labelId)) return { add: [], remove: [labelId] };
  const label = labelOf(state, labelId);
  const siblings = label?.single ? issue.labelIds.filter((id) => id !== labelId && labelOf(state, id)?.parentId === label.parentId) : [];
  return { add: [labelId], remove: siblings };
}

const NOOP = { type: "noop" };
const insert = (list, at, item) => [...list.slice(0, Math.min(at, list.length)), item, ...list.slice(Math.min(at, list.length))];
const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k]]));

// Applies one change. Returns { state, inverse }.
export function applyChange(state, change) {
  const issueAt = state.issues.findIndex((i) => i.id === change.id);
  const noteAt = state.notifications.findIndex((n) => n.id === change.id);
  const unchanged = { state, inverse: NOOP };
  switch (change.type) {
    case "noop":
      return unchanged;
    case "addIssue":
      return { state: { ...state, issues: insert(state.issues, change.at ?? 0, change.issue) }, inverse: { type: "removeIssue", id: change.issue.id } };
    case "removeIssue":
      if (issueAt < 0) return unchanged;
      return {
        state: { ...state, issues: state.issues.filter((i) => i.id !== change.id) },
        inverse: { type: "addIssue", issue: state.issues[issueAt], at: issueAt },
      };
    case "updateIssue": {
      if (issueAt < 0) return unchanged;
      const old = state.issues[issueAt];
      const next = { ...old, ...change.patch };
      if ("stateId" in change.patch && !isOpen(stateOf(state, next.stateId))) return applyChange(state, { type: "removeIssue", id: old.id });
      return {
        state: { ...state, issues: state.issues.map((i, n) => (n === issueAt ? next : i)) },
        inverse: { type: "updateIssue", id: old.id, patch: pick(old, Object.keys(change.patch)) },
      };
    }
    case "labels": {
      if (issueAt < 0) return unchanged;
      const old = state.issues[issueAt];
      const add = change.add.filter((id) => !old.labelIds.includes(id));
      const remove = change.remove.filter((id) => old.labelIds.includes(id));
      const labelIds = [...old.labelIds.filter((id) => !remove.includes(id)), ...add];
      return {
        state: { ...state, issues: state.issues.map((i, n) => (n === issueAt ? { ...old, labelIds } : i)) },
        inverse: { type: "labels", id: old.id, add: remove, remove: add },
      };
    }
    case "replaceIssue":
      if (issueAt < 0) return unchanged;
      return {
        state: { ...state, issues: state.issues.map((i, n) => (n === issueAt ? change.issue : i)) },
        inverse: { type: "replaceIssue", id: change.issue.id, issue: state.issues[issueAt] },
      };
    case "updateNotification": {
      if (noteAt < 0) return unchanged;
      const old = state.notifications[noteAt];
      return {
        state: { ...state, notifications: state.notifications.map((x, n) => (n === noteAt ? { ...old, ...change.patch } : x)) },
        inverse: { type: "updateNotification", id: old.id, patch: pick(old, Object.keys(change.patch)) },
      };
    }
    case "addNotification":
      return {
        state: { ...state, notifications: insert(state.notifications, change.at, change.notification) },
        inverse: { type: "removeNotification", id: change.notification.id },
      };
    case "removeNotification":
      if (noteAt < 0) return unchanged;
      return {
        state: { ...state, notifications: state.notifications.filter((n) => n.id !== change.id) },
        inverse: { type: "addNotification", notification: state.notifications[noteAt], at: noteAt },
      };
    default:
      throw new Error(`unknown change ${change.type}`);
  }
}
