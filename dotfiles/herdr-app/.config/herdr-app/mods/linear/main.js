// Linear's GitButler workspace in a dialog: the Inbox, every open issue by
// status, and the projects, with the selected item on the right. Changed with
// vim-like keys through Linear's GraphQL API. Every change shows at once and
// goes back if Linear refuses it. KEYS is the list of what every key does; the
// footer and the ? sheet are drawn from it.

import { View, div } from "gpui-kit";
import {
  v_flex, h_flex, Scrollbar, v_virtual_list, VirtualListScrollHandle, ScrollHandle,
  InputState, Input, TextareaState, Textarea, TextView,
} from "gpui-base";
import { exec, run, theme, props, closeOverlay, openOverlay, spaces, home, readTextFile, writeTextFile } from "herdr";
import { createLinear, KEY_FILE } from "./linear.js";
import {
  fromLists, issueOf, issueRows, projectRows, inboxRows, applyChange, labelToggle, workflow, pickStates,
  stateOf, labelOf, projectById, labelName, isOpen, isDoneProject, openCount, PRIORITY, OPEN_TYPES,
} from "./model.js";
import { pickerRows, settle, move as movePick, renderPicker, deliver, PickerSearch, pickerKey } from "./session-picker.js";
import { HelpSearch } from "./help.js";

const VIEWS = [["inbox", "Inbox"], ["issues", "Issues"], ["projects", "Projects"]];

const KEYS = [
  { keys: ["j", "down"], label: "next", group: "Move", act: "next" },
  { keys: ["k", "up"], label: "previous", group: "Move", act: "prev" },
  { keys: ["tab"], label: "next view", group: "Move", act: "nextView", footer: true },
  { keys: ["shift-tab"], label: "previous view", group: "Move", act: "prevView" },
  { keys: ["/"], label: "filter", group: "Move", act: "filter", footer: true },
  { keys: ["J"], label: "scroll down", group: "Read", act: "lineDown" },
  { keys: ["K"], label: "scroll up", group: "Read", act: "lineUp" },
  { keys: ["ctrl-d"], label: "half page down", group: "Read", act: "pageDown" },
  { keys: ["ctrl-u"], label: "half page up", group: "Read", act: "pageUp" },
  { keys: ["enter"], label: "open a project, else open in Linear", group: "Go", act: "enter" },
  { keys: ["o"], label: "open in Linear", group: "Go", act: "open", footer: true },
  { keys: ["p"], label: "send to a session", group: "Go", act: "route", footer: true },
  { keys: ["Y"], label: "copy link", group: "Go", act: "copy" },
  { keys: ["s"], label: "status", group: "Issue", act: "status", issue: true, footer: true },
  { keys: ["i"], label: "assign me / unassign", group: "Issue", act: "assign", issue: true, footer: true },
  { keys: ["l"], label: "labels", group: "Issue", act: "labels", issue: true, footer: true },
  { keys: ["m"], label: "move to a project", group: "Issue", act: "project", issue: true },
  { keys: ["r"], label: "comment", group: "Issue", act: "comment", issue: true, footer: true },
  { keys: ["c"], label: "new issue", group: "Issue", act: "create", views: ["issues", "projects"], footer: true },
  { keys: ["d"], label: "dismiss", group: "Inbox", act: "dismiss", views: ["inbox"], footer: true },
  { keys: ["D"], label: "show done projects", group: "Projects", act: "showDone", views: ["projects"] },
  { keys: ["ctrl-r"], label: "reload", group: "Other", act: "reload" },
  { keys: ["?"], label: "all keys", group: "Other", act: "help", footer: true },
  { keys: ["q", "escape"], label: "close, or back one step", group: "Other", act: "close" },
];
const WRITES = ["status", "assign", "labels", "project", "comment", "create", "dismiss"];
const KEY_LABEL = {
  down: "↓", up: "↑", enter: "↵", escape: "Esc", tab: "Tab", "shift-tab": "⇧Tab",
  "ctrl-r": "⌃R", "ctrl-d": "⌃D", "ctrl-u": "⌃U",
};

const ROW = { section: 30, issue: 48, project: 48, notification: 52 };
const PICKERS = {
  status: { title: "Set status", placeholder: "Status…", hint: "↵ set" },
  labels: { title: "Labels", placeholder: "Label…", hint: "↵ add or remove" },
  project: { title: "Move to project", placeholder: "Project…", hint: "↵ move" },
};
const MAX_TEXT = 6000;
const CACHE = ".cache/herdr-linear";
const CACHE_VERSION = 1;

function keyName(e) {
  const m = e.modifiers ?? {};
  if (m.control) return `ctrl-${e.key}`;
  if (m.platform) return `cmd-${e.key}`;
  if (e.key === "tab") return m.shift ? "shift-tab" : "tab";
  if (["down", "up", "enter", "escape"].includes(e.key)) return e.key;
  return e.key_char || e.key;
}

const errorText = (e) => String(e?.message ?? e);
const isPending = (id) => String(id).startsWith("pending-");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let pendingIds = 0;

function ago(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)}d`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${d.getFullYear() === new Date().getFullYear() ? "" : ` ${d.getFullYear()}`}`;
}

const humanize = (type) => String(type ?? "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
const cut = (text) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}\n\n…` : text);

// Splits markdown at blank lines outside code fences, so J and K step through
// a long description a paragraph at a time.
function paragraphs(text) {
  const out = [];
  let cur = [];
  let fence = false;
  for (const line of cut(text).split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (!fence && !line.trim()) {
      if (cur.length) out.push(cur.join("\n"));
      cur = [];
    } else cur.push(line);
  }
  if (cur.length) out.push(cur.join("\n"));
  return out;
}

// Enter sends and Shift+Enter adds a line, as in the GitHub inbox's comment box.
function enterSends(state, send) {
  let now = state.value();
  let before = now;
  state.on("change", () => { before = now; now = state.value(); });
  state.on("submit", (e, cx) => {
    if (e.shift || e.secondary) return;
    state.set_value(before);
    now = before;
    send(cx);
  });
  return (text) => {
    state.set_value(text);
    state.set_selected_range({ start: text.length, end: text.length });
    now = before = text;
  };
}

export default class Linear extends View {
  init(_props, cx) {
    this.data = null;
    this.client = null;
    this.keyMissing = false;
    this.view = "inbox";
    this.projectId = null; // the project whose issues the Projects view shows
    this.sel = {}; // list key → { id, at }
    this.showDone = false;
    this.loading = false;
    this.loadError = null;
    this.refreshQueued = false;
    this.note = null; // { text, level } in the footer until the next key
    this.help = false;
    this.details = new Map(); // issue id → { updatedAt, detail } | { updatedAt, error }
    this.wanted = null;
    this.fetching = false;
    this.shownKey = null;
    this.prompt = null; // { projectId } while the new issue box is open
    this.picker = null; // { kind, issueId, at, applied } while a picker is open
    this.compose = null; // { issue } while the comment box is open
    this.route = null; // { at, row } while the session picker is open
    this.filtering = false;
    this.handle = cx.focus_handle();
    this.helpSearch = new HelpSearch(this.handle);
    this.filter = InputState.new({ placeholder: "Filter by title, id, person, project, label or status…" });
    this.filter.on("change", (_e, cx) => cx.notify());
    this.filter.on("submit", (_e, cx) => this.endFilter(cx));
    this.text = null;
    this.query = null;
    this.comment = TextareaState.new({ rows: 4 });
    this.comment.set_auto_grow(3, 12);
    this.setComment = enterSends(this.comment, (cx) => this.submitComment(cx));
    this.routeScroll = ScrollHandle.new();
    this.routeSearch = new PickerSearch(this.handle, {
      onChange: (_e, cx) => { if (this.route) this.route.at = -1; cx.notify(); },
      onSubmit: (_e, cx) => this.pickSession(cx),
    });
    this.listScroll = VirtualListScrollHandle.new();
    this.detailScroll = ScrollHandle.new();
    this.detailAt = null; // the detail block J and K have reached
    this.pickerScroll = ScrollHandle.new();
    // gpui-kit binds Tab and Shift-Tab to focus cycling before key handlers
    // see them: bindings of our own, deeper in, come first.
    try {
      cx.bind_keys([
        { keystroke: "tab", action: "linear_next_view", context: "LinearDialog" },
        { keystroke: "shift-tab", action: "linear_prev_view", context: "LinearDialog" },
      ]);
    } catch {}
    cx.timer.after(0, () => this.handle.focus());
    cx.spawn(async (cx) => {
      const cached = await this.readCache();
      if (cached && !this.data) {
        this.data = cached;
        this.wantDetail(cx);
        cx.notify();
      }
      await this.readKey();
      this.refresh(cx);
    });
  }

  // ---- Linear ----

  async readKey() {
    const text = await readTextFile(`${home()}/${KEY_FILE}`).catch(() => null);
    const key = text?.trim();
    this.keyMissing = !key;
    this.client = key ? createLinear({ key }) : null;
  }

  async readCache() {
    const text = await readTextFile(`${home()}/${CACHE}/lists.json`).catch(() => null);
    if (!text) return null;
    try {
      const entry = JSON.parse(text);
      return entry.version === CACHE_VERSION ? fromLists(entry.lists) : null;
    } catch {
      return null;
    }
  }

  async saveCache(lists) {
    this.made ??= exec("mkdir", ["-p", `${home()}/${CACHE}`]);
    await this.made;
    const path = `${home()}/${CACHE}/lists.json`;
    const old = await readTextFile(path).catch(() => null);
    await writeTextFile(path, JSON.stringify({ version: CACHE_VERSION, lists }), old).catch(() => {});
  }

  // Reads the lists again once every queued write is done. A refresh that ends
  // while writes wait behind it is dropped: the last write refreshes again.
  refresh(cx) {
    if (!this.client) {
      this.loading = false;
      return cx.notify();
    }
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    this.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const lists = await this.client.enqueue(() => {
          this.refreshQueued = false;
          return this.client.lists();
        });
        if (this.client.pending() === 0) {
          this.data = fromLists(lists);
          this.loadError = null;
          this.saveCache(lists);
        }
      } catch (e) {
        this.loadError = errorText(e);
      }
      this.loading = this.refreshQueued;
      this.wantDetail(cx);
      cx.notify();
    });
  }

  reload(cx) {
    this.details = new Map([...this.details].filter(([, d]) => !d.error));
    cx.spawn(async (cx) => {
      if (!this.client) await this.readKey();
      this.refresh(cx);
    });
  }

  apply(change) {
    const { state, inverse } = applyChange(this.data, change);
    this.data = state;
    return inverse;
  }

  // Shows a change at once, sends it to Linear, and takes it back if Linear refuses.
  write(cx, change, text, call, done) {
    const inverse = this.apply(change);
    this.flash(cx, text, "success");
    cx.spawn(async (cx) => {
      try {
        const body = await call();
        if (done) this.apply(done(body));
      } catch (e) {
        this.apply(inverse);
        this.flash(cx, errorText(e), "error");
      }
      this.refresh(cx);
      cx.notify();
    });
  }

  flash(cx, text, level = "info") {
    this.note = { text, level };
    cx.notify();
  }

  // ---- The detail of the selected issue ----

  fresh(id) {
    const d = this.details.get(id);
    if (!d) return false;
    const listed = this.data?.issues.find((i) => i.id === id);
    return !listed || d.updatedAt === listed.updatedAt;
  }

  // Fetches the selected issue's description and comments, one at a time; the
  // latest selection wins.
  wantDetail(cx) {
    const row = this.selected();
    const key = row ? this.rowKey(row) : null;
    if (key !== this.shownKey) {
      this.shownKey = key;
      this.detailAt = null;
      this.detailScroll.scroll_to_item(0);
    }
    const id = row?.kind === "issue" ? row.issue.id : row?.kind === "notification" ? row.notification.issueId : null;
    if (!this.client || !id || isPending(id) || this.fresh(id)) return;
    this.wanted = id;
    if (this.fetching) return;
    this.fetching = true;
    cx.spawn(async (cx) => {
      while (this.wanted && !this.fresh(this.wanted)) {
        const id = this.wanted;
        const updatedAt = this.data?.issues.find((i) => i.id === id)?.updatedAt;
        try {
          const detail = await this.client.issueDetail(id);
          this.details.set(id, { updatedAt: detail.updatedAt, detail });
        } catch (e) {
          this.details.set(id, { updatedAt, error: errorText(e) });
        }
        cx.notify();
      }
      this.fetching = false;
    });
  }

  // ---- Lists and selection ----

  listKey() {
    return this.view === "projects" && this.projectId ? `project:${this.projectId}` : this.view;
  }

  rows() {
    if (!this.data) return [];
    const query = this.filter.value();
    if (this.view === "inbox") return inboxRows(this.data, { query });
    if (this.view === "issues") return issueRows(this.data, { query });
    if (this.projectId) return issueRows(this.data, { projectId: this.projectId, query });
    return projectRows(this.data, { showDone: this.showDone, query });
  }

  rowId(row) {
    return row[row.kind]?.id ?? row.title;
  }

  rowKey(row) {
    return `${row.kind}:${this.rowId(row)}`;
  }

  // The selected row's index: the remembered item, else the row now where it was.
  index(rows = this.rows()) {
    const s = this.sel[this.listKey()];
    let i = s?.id == null ? -1 : rows.findIndex((r) => r.kind !== "section" && this.rowId(r) === s.id);
    if (i < 0) {
      i = Math.min(s?.at ?? 0, rows.length - 1);
      while (i >= 0 && rows[i].kind === "section") i++;
      if (i >= rows.length) i = rows.findIndex((r) => r.kind !== "section");
    }
    return i;
  }

  selected() {
    const rows = this.rows();
    return rows[this.index(rows)] ?? null;
  }

  select(rows, i) {
    const row = rows[i];
    if (!row) return;
    this.sel = { ...this.sel, [this.listKey()]: { id: this.rowId(row), at: i } };
    this.listScroll.scroll_to_item(i);
  }

  move(cx, by) {
    const rows = this.rows();
    let i = this.index(rows);
    for (let j = i + by; j >= 0 && j < rows.length; j += by) {
      if (rows[j].kind !== "section") { i = j; break; }
    }
    this.select(rows, i);
    cx.notify();
  }

  // Selects the row after the given one before it leaves the list.
  selectNextOf(id) {
    const rows = this.rows();
    const i = rows.findIndex((r) => r.kind !== "section" && this.rowId(r) === id);
    if (i < 0) return;
    const next = rows.slice(i + 1).find((r) => r.kind !== "section") ?? rows.slice(0, i).reverse().find((r) => r.kind !== "section");
    this.sel = { ...this.sel, [this.listKey()]: { id: next ? this.rowId(next) : null, at: i } };
  }

  setView(cx, view) {
    this.view = view;
    cx.notify();
  }

  cycleView(cx, by) {
    const i = VIEWS.findIndex(([v]) => v === this.view);
    this.setView(cx, VIEWS[(i + by + VIEWS.length) % VIEWS.length][0]);
  }

  // The issue a row is or carries: a listed one, else one read for its detail.
  rowIssue(row) {
    if (row?.kind === "issue") return row.issue;
    const id = row?.kind === "notification" ? row.notification.issueId : null;
    if (!id) return null;
    const detail = this.details.get(id)?.detail;
    return this.data.issues.find((i) => i.id === id) ?? (detail ? issueOf(detail) : null);
  }

  // The issue as it is now, after changes made since a picker opened.
  current(id) {
    return this.data.issues.find((i) => i.id === id) ?? this.picker?.issue ?? null;
  }

  urlOf(row) {
    return row?.[row.kind]?.url ?? null;
  }

  ready(cx, id) {
    if (!isPending(id)) return true;
    this.flash(cx, "Still saving it in Linear…");
    return false;
  }

  // ---- Changes ----

  setStatus(cx, issue, s) {
    if (s.id === issue.stateId) return;
    if (!isOpen(s)) this.selectNextOf(issue.id);
    this.write(cx, { type: "updateIssue", id: issue.id, patch: { stateId: s.id } }, `${issue.identifier} → ${s.name}`,
      () => this.client.updateIssue(issue.id, { stateId: s.id }));
  }

  assign(cx, issue) {
    const me = this.data.viewer;
    const mine = issue.assignee?.id === me.id;
    this.write(cx, { type: "updateIssue", id: issue.id, patch: { assignee: mine ? null : { id: me.id, name: me.name, handle: null } } },
      mine ? `Unassigned ${issue.identifier}` : `Assigned ${issue.identifier} to you`,
      () => this.client.updateIssue(issue.id, { assigneeId: mine ? null : me.id }));
  }

  toggleLabel(cx, issue, labelId) {
    const { add, remove } = labelToggle(this.data, issue, labelId);
    const name = labelOf(this.data, labelId)?.name ?? "label";
    this.write(cx, { type: "labels", id: issue.id, add, remove }, add.length ? `Labelled ${name}` : `Removed ${name}`,
      () => this.client.labels(issue.id, add, remove));
  }

  moveToProject(cx, issue, project) {
    const projectId = project?.id ?? null;
    if (projectId === issue.projectId) return;
    if (this.projectId && this.projectId !== projectId) this.selectNextOf(issue.id);
    this.write(cx, { type: "updateIssue", id: issue.id, patch: { projectId, milestone: null } },
      project ? `Moved ${issue.identifier} to ${project.name}` : `Took ${issue.identifier} out of its project`,
      () => this.client.updateIssue(issue.id, { projectId }));
  }

  createIssue(cx, title, projectId) {
    const team = this.data.teams[0];
    const states = workflow(this.data).filter((s) => s.teamId === team.id);
    const start = states.find((s) => s.type === "backlog") ?? states.find(isOpen);
    const now = new Date().toISOString();
    const issue = {
      id: `pending-${++pendingIds}`, identifier: `${team.key}-…`, title, url: null, priority: 0, updatedAt: now, createdAt: now,
      stateId: start?.id ?? null, assignee: null, creator: this.data.viewer.name, projectId, milestone: null, parent: null, labelIds: [],
    };
    const project = projectById(this.data, projectId);
    if (this.view !== "projects" || this.projectId) this.sel = { ...this.sel, [this.listKey()]: { id: issue.id, at: 0 } };
    this.write(cx, { type: "addIssue", issue, at: 0 }, project ? `Added to ${project.name}` : "Added",
      () => this.client.createIssue({ teamId: team.id, title, projectId }),
      (body) => {
        const real = issueOf(body.issueCreate.issue);
        for (const [k, s] of Object.entries(this.sel)) if (s?.id === issue.id) this.sel = { ...this.sel, [k]: { ...s, id: real.id } };
        return { type: "replaceIssue", id: issue.id, issue: real };
      });
  }

  openItem(cx, row) {
    const url = this.urlOf(row);
    if (!url) return this.flash(cx, "No link for this yet");
    exec("open", [url]).catch(() => {});
    if (row.kind === "notification" && !row.notification.readAt) {
      const n = row.notification;
      this.write(cx, { type: "updateNotification", id: n.id, patch: { readAt: new Date().toISOString() } }, "Opened in Linear",
        () => this.client.markRead(n));
    } else this.flash(cx, "Opened in Linear");
  }

  dismiss(cx, n) {
    this.selectNextOf(n.id);
    this.write(cx, { type: "removeNotification", id: n.id }, "Dismissed", () => this.client.archive(n));
  }

  copy(cx, row) {
    const url = this.urlOf(row);
    if (!url) return this.flash(cx, "No link for this yet");
    cx.spawn(async (cx) => {
      const r = await exec("sh", ["-c", 'printf %s "$1" | pbcopy', "sh", url]).catch((e) => ({ code: 1, stderr: errorText(e) }));
      this.flash(cx, r.code === 0 ? `Copied ${url}` : r.stderr.trim() || "pbcopy failed", r.code === 0 ? "success" : "error");
    });
  }

  // ---- Comment box ----

  openCompose(cx, issue, text = "") {
    this.compose = { issue };
    this.setComment(text);
    this.comment.focus();
    cx.notify();
  }

  closeCompose(cx) {
    this.compose = null;
    this.handle.focus();
    cx.notify();
  }

  submitComment(cx) {
    const issue = this.compose?.issue;
    const body = this.comment.value().trim();
    if (!issue || !body) return;
    this.setComment("");
    this.closeCompose(cx);
    const entry = this.details.get(issue.id);
    const mine = { id: `pending-${++pendingIds}`, body, createdAt: new Date().toISOString(), user: { name: this.data.viewer.name } };
    const withComment = (d, add) => ({ ...d, comments: { nodes: add ? [...d.comments.nodes, mine] : d.comments.nodes.filter((c) => c.id !== mine.id) } });
    if (entry?.detail) this.details.set(issue.id, { ...entry, detail: withComment(entry.detail, true) });
    this.flash(cx, `Commented on ${issue.identifier}`, "success");
    cx.spawn(async (cx) => {
      try {
        await this.client.comment(issue.id, body);
        this.details.delete(issue.id);
      } catch (e) {
        const now = this.details.get(issue.id);
        if (now?.detail) this.details.set(issue.id, { ...now, detail: withComment(now.detail, false) });
        if (!this.compose) this.openCompose(cx, issue, body);
        this.flash(cx, errorText(e), "error");
      }
      this.refresh(cx);
    });
  }

  // ---- New issue box ----

  openPrompt(cx, projectId) {
    this.prompt = { projectId };
    this.text = InputState.new({ placeholder: "Issue title" });
    this.text.on("submit", (_e, cx) => this.submitPrompt(cx));
    this.text.focus();
    cx.notify();
  }

  closePrompt(cx) {
    this.prompt = null;
    this.handle.focus();
    cx.notify();
  }

  submitPrompt(cx) {
    const p = this.prompt;
    if (!p) return;
    const title = this.text.value().trim();
    this.closePrompt(cx);
    if (title) this.createIssue(cx, title, p.projectId);
  }

  // ---- Status, label and project picker ----

  openPicker(cx, kind, issue) {
    this.picker = { kind, issue, at: 0, applied: new Set(issue.labelIds) };
    this.query = InputState.new({ placeholder: PICKERS[kind].placeholder });
    this.query.on("change", (_e, cx) => { if (this.picker) this.picker.at = 0; cx.notify(); });
    this.query.on("submit", (_e, cx) => this.pick(cx));
    this.query.focus();
    cx.notify();
  }

  closePicker(cx) {
    this.picker = null;
    this.handle.focus();
    cx.notify();
  }

  pickerList() {
    const { kind, applied } = this.picker;
    const issue = this.current(this.picker.issue.id);
    let all;
    if (kind === "status") {
      all = pickStates(this.data).map((s) => ({ id: s.id, title: s.name, color: s.color, on: s.id === issue.stateId, value: s }));
    } else if (kind === "labels") {
      all = this.data.labels.filter((l) => !l.isGroup).map((l) => ({ id: l.id, title: labelName(l), color: l.color, on: issue.labelIds.includes(l.id), check: true }))
        .sort((a, b) => applied.has(b.id) - applied.has(a.id) || a.title.localeCompare(b.title));
    } else {
      all = [{ id: null, title: "No project", on: !issue.projectId, value: null },
        ...this.data.projects.filter((p) => !isDoneProject(p)).sort((a, b) => a.name.localeCompare(b.name))
          .map((p) => ({ id: p.id, title: p.name, on: p.id === issue.projectId, value: p, note: p.status.name }))];
    }
    const q = this.query.value().trim().toLowerCase();
    return q ? all.filter((x) => x.title.toLowerCase().includes(q)) : all;
  }

  pick(cx, i = this.picker?.at) {
    if (!this.picker) return;
    const item = this.pickerList()[i];
    if (!item) return;
    const issue = this.current(this.picker.issue.id);
    const { kind } = this.picker;
    if (kind === "labels") {
      this.picker.at = i;
      return this.toggleLabel(cx, issue, item.id);
    }
    this.closePicker(cx);
    if (kind === "status") this.setStatus(cx, issue, item.value);
    else this.moveToProject(cx, issue, item.value);
  }

  // ---- Filter ----

  startFilter(cx) {
    this.filtering = true;
    this.filter.focus();
    cx.notify();
  }

  endFilter(cx) {
    this.filtering = false;
    this.handle.focus();
    this.wantDetail(cx);
    cx.notify();
  }

  // ---- Sending to a session ----

  // The one line a session gets; it reads the rest with its Linear MCP.
  routeText(row) {
    const issue = this.rowIssue(row);
    if (issue && !isPending(issue.id)) return `Linear issue ${issue.identifier} "${issue.title}": ${issue.url}`;
    if (row.kind === "project") return `Linear project "${row.project.name}": ${row.project.url}`;
    const n = row.notification;
    return `Linear notification: ${[n.title, n.subtitle].filter(Boolean).join(" — ")} ${n.url ?? ""}`.trim();
  }

  // New sessions start in the home space on this Mac, where agent sessions start, or in the active space.
  starts() {
    const all = spaces();
    const homeSpace = all.find((s) => s.machine === null && s.name === "home");
    const active = all.find((s) => s.active);
    return [homeSpace, active && active.id !== homeSpace?.id ? active : null].filter(Boolean)
      .map((s) => ({ title: `New session in ${s.name}`, detail: s.machine ?? "", value: s }));
  }

  routeRows() {
    const rows = pickerRows(this.starts(), this.routeSearch.value());
    if (this.route.at < 0 || !rows[this.route.at]) {
      this.route.at = settle(rows);
      this.routeScroll.scroll_to_item(Math.max(0, this.route.at));
    }
    return rows;
  }

  openRoute(cx, row) {
    if (row.kind === "issue" && !this.ready(cx, row.issue.id)) return;
    this.route = { at: -1, row };
    this.routeSearch.reset();
    cx.notify();
  }

  pickSession(cx, i = this.route?.at) {
    const item = this.route?.row;
    const row = this.routeRows()[i];
    if (!item || !row || (row.kind !== "session" && row.kind !== "start")) return;
    const text = this.routeText(item);
    this.route = null;
    this.routeSearch.reset();
    // Once the session has the item, the dialog closes and the session shows.
    if (row.kind === "start") {
      const s = row.value;
      openOverlay({ mod: "new-pi", props: { space: s.id, folder: s.folder, task: text }, kind: "popup", width: 1, height: 1, frame: "none" });
      return closeOverlay(props().overlay);
    }
    if (row.agent.status === "blocked") return this.flash(cx, `${row.name} needs you first: answer it, then send`, "error");
    this.flash(cx, `Sending to ${row.name}…`);
    cx.spawn(async (cx) => {
      try {
        await deliver(row, text);
        run("pane.focus", { pane: row.agent.pane });
        closeOverlay(props().overlay);
      } catch (e) {
        this.flash(cx, errorText(e), "error");
      }
    });
  }

  // ---- Keys ----

  stepping() {
    return Boolean(this.route || this.prompt || this.picker || this.compose || this.help || this.filtering || this.filter.value() || this.projectId);
  }

  // Escape is Herdr's overlay.close binding, which runs before key handlers.
  // While a box, picker or the help sheet is open, a filter is set, or Projects
  // shows one project's issues, the root takes that action and goes back one step.
  back(cx) {
    if (this.route && this.routeSearch.stop()) cx.notify();
    else if (this.route) { this.route = null; cx.notify(); }
    else if (this.prompt) this.closePrompt(cx);
    else if (this.picker) this.closePicker(cx);
    else if (this.compose) this.closeCompose(cx);
    else if (this.help) {
      if (!this.helpSearch.stop()) this.help = false;
      cx.notify();
    }
    else if (this.filtering || this.filter.value()) {
      this.filter.set_value("");
      this.endFilter(cx);
    } else if (this.projectId) {
      this.projectId = null;
      this.wantDetail(cx);
      cx.notify();
    }
  }

  // J and K step a marker through the detail's blocks (the description a
  // paragraph at a time, each comment), and the detail scrolls to keep it shown.
  scrollDetail(cx, by) {
    const last = (this.detailCount ?? 1) - 1;
    this.detailAt = Math.max(0, Math.min(last, (this.detailAt ?? 0) + by));
    this.detailScroll.scroll_to_item(this.detailAt);
    cx.notify();
  }

  key(e, cx) {
    const k = keyName(e);
    if (this.prompt || this.compose) return;
    if (this.filtering) {
      if (k !== "down" && k !== "up") return;
      cx.stop_propagation();
      this.move(cx, k === "down" ? 1 : -1);
      return this.wantDetail(cx);
    }
    if (this.help) {
      const act = this.helpSearch.key(k);
      if (act === "type") return;
      cx.stop_propagation();
      if (act === "search") this.helpSearch.start(cx);
      else this.help = false;
      return cx.notify();
    }
    if (this.route) {
      if (this.routeSearch.active && !pickerKey(this.routeSearch, k).move) return;
      cx.stop_propagation();
      const act = pickerKey(this.routeSearch, k);
      if (act.search) this.routeSearch.start();
      else if (act.pick) return this.pickSession(cx);
      else if (act.move) {
        this.route.at = movePick(this.routeRows(), this.route.at, act.move);
        this.routeScroll.scroll_to_item(this.route.at);
      } else return;
      return cx.notify();
    }
    if (this.picker) {
      const n = this.pickerList().length || 1;
      if (k === "down" || k === "ctrl-n") this.picker.at = (this.picker.at + 1) % n;
      else if (k === "up" || k === "ctrl-p") this.picker.at = (this.picker.at + n - 1) % n;
      else return;
      cx.stop_propagation();
      this.pickerScroll.scroll_to_item(this.picker.at);
      return cx.notify();
    }
    const entry = KEYS.find((x) => x.keys.includes(k) && (!x.views || x.views.includes(this.view)));
    if (!entry) return;
    cx.stop_propagation();
    this.note = null;
    if (!this.data && !["close", "reload", "help", "nextView", "prevView"].includes(entry.act)) return cx.notify();
    const row = this.selected();
    const issue = this.rowIssue(row);
    if (WRITES.includes(entry.act) && !this.client) return this.flash(cx, `Changes need an API key in ~/${KEY_FILE}`, "error");
    if (entry.issue) {
      if (!issue) return this.flash(cx, row ? "This has no issue" : "Select an issue first");
      if (!this.ready(cx, issue.id)) return;
    }
    switch (entry.act) {
      case "next": this.move(cx, 1); break;
      case "prev": this.move(cx, -1); break;
      case "nextView": this.cycleView(cx, 1); break;
      case "prevView": this.cycleView(cx, -1); break;
      case "filter": return this.startFilter(cx);
      case "lineDown": return this.scrollDetail(cx, 1);
      case "lineUp": return this.scrollDetail(cx, -1);
      case "pageDown": return this.scrollDetail(cx, 4);
      case "pageUp": return this.scrollDetail(cx, -4);
      case "enter":
        if (row?.kind === "project") {
          this.projectId = row.project.id;
          break;
        }
        return row && this.openItem(cx, row);
      case "open": return row && this.openItem(cx, row);
      case "route": return row && this.openRoute(cx, row);
      case "copy": return row && this.copy(cx, row);
      case "status": return this.openPicker(cx, "status", issue);
      case "assign": return this.assign(cx, issue);
      case "labels": return this.openPicker(cx, "labels", issue);
      case "project": return this.openPicker(cx, "project", issue);
      case "comment": return this.openCompose(cx, issue);
      case "create": {
        const projectId = this.view === "projects" ? this.projectId ?? (row?.kind === "project" ? row.project.id : null) : null;
        if (this.view === "projects" && !projectId) return this.flash(cx, "Select a project first");
        return this.openPrompt(cx, projectId);
      }
      case "dismiss": return row?.kind === "notification" && this.dismiss(cx, row.notification);
      case "showDone":
        this.showDone = !this.showDone;
        return this.flash(cx, this.showDone ? "Showing done projects" : "Hiding done projects");
      case "reload": return this.reload(cx);
      case "help": this.helpSearch.reset(); this.help = true; return cx.notify();
      case "close":
        if (this.stepping()) return this.back(cx);
        return closeOverlay(props().overlay);
    }
    this.wantDetail(cx);
    cx.notify();
  }

  // ---- Drawing ----

  keyChip(t, k) {
    return div().flex_none().px(5).h(18).rounded(4).bg(t.raised).text_color(t.foreground).text_size(11).flex().items_center().child(KEY_LABEL[k] ?? k);
  }

  chip(t, text, color = t.muted) {
    return h_flex().flex_none().px(7).h(20).rounded(10).items_center().bg(t.raised).text_size(11).text_color(color).child(text);
  }

  // A title and an optional note in the middle of a pane.
  centered(t, pane, title, note, color = t.foreground) {
    return pane.items_center().justify_center().gap(6)
      .child(div().text_size(18).font_semibold().text_color(color).child(title))
      .when(!!note, (el) => el.child(div().max_w(560).text_size(12).text_color(t.dim).child(note)));
  }

  dot(color, size = 8) {
    return div().flex_none().size(size).rounded_full().bg(color);
  }

  projectColor(t, type) {
    return { started: t.ansi3, paused: t.muted, planned: t.ansi4, backlog: t.dim, completed: t.ansi2, canceled: t.dim }[type] ?? t.dim;
  }

  issueRow(t, issue) {
    const state = stateOf(this.data, issue.stateId);
    const project = projectById(this.data, issue.projectId);
    const labels = issue.labelIds.map((id) => labelOf(this.data, id)).filter(Boolean);
    const meta = [
      project && (issue.milestone ? `${project.name} › ${issue.milestone}` : project.name),
      ...labels.map((l) => l.name),
      PRIORITY[issue.priority] || null,
    ].filter(Boolean).join(" · ");
    const pending = isPending(issue.id);
    return h_flex().gap(10).items_center()
      .child(this.dot(state?.color ?? t.dim))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(h_flex().gap(8).items_center()
          .child(div().flex_none().w(60).text_size(11.5).text_color(t.dim).child(issue.identifier))
          .child(div().flex_1().min_w(0).truncate().text_color(pending ? t.muted : t.foreground).child(issue.title)))
        .child(h_flex().gap(8).items_center()
          .child(div().flex_none().w(60))
          .child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(t.dim).child(meta || " "))))
      .child(div().flex_none().text_size(11.5).text_color(issue.assignee ? t.muted : t.dim).child(issue.assignee?.name.split(" ")[0] ?? ""));
  }

  notificationRow(t, n) {
    const unread = !n.readAt;
    const title = n.title ?? (n.issue ? `${n.issue.identifier} ${n.issue.title}` : humanize(n.type));
    const second = n.subtitle ?? (n.title || n.issue ? [n.actor, humanize(n.type)] : [n.actor]).filter(Boolean).join(" · ");
    return h_flex().gap(10).items_center()
      .child(unread ? this.dot(t.accent, 7) : div().flex_none().size(7))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(h_flex().gap(8).items_center()
          .child(unread ? div().flex_1().min_w(0).truncate().font_semibold().text_color(t.foreground).child(title)
            : div().flex_1().min_w(0).truncate().text_color(t.muted).child(title))
          .child(div().flex_none().text_size(11).text_color(unread ? t.accent : t.dim).child(ago(n.createdAt))))
        .child(div().truncate().text_size(11.5).text_color(t.dim).child(second)));
  }

  projectRow(t, p) {
    const count = openCount(this.data, p.id);
    const meta = [p.lead, `${Math.round(p.progress * 100)}%`, p.targetDate].filter(Boolean).join(" · ");
    return h_flex().gap(10).items_center()
      .child(this.dot(this.projectColor(t, p.status.type)))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(div().truncate().text_color(isDoneProject(p) ? t.muted : t.foreground).child(p.name))
        .child(div().truncate().text_size(11.5).text_color(t.dim).child(meta)))
      .when(count > 0, (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(`${count} open`)));
  }

  renderList(t) {
    const rows = this.rows();
    const at = this.index(rows);
    const pane = v_flex().w(420).flex_none().h_full().relative();
    if (!rows.length) {
      const empty = this.filter.value() ? "Nothing matches the filter"
        : { inbox: "Inbox zero", issues: "No open issues", projects: this.projectId ? "No open issues in this project" : "No projects" }[this.view];
      return pane.items_center().justify_center().child(div().text_color(t.dim).child(empty));
    }
    const draw = (row, i) => {
      if (row.kind === "section") {
        return h_flex().h(ROW.section).px(10).pt(10).gap(6).items_center()
          .when(!!row.color, (el) => el.child(this.dot(row.color, 7)))
          .child(div().text_size(10.5).font_semibold().text_color(t.dim).child(`${row.title.toUpperCase()}  ${row.count}`));
      }
      const on = i === at;
      const body = row.kind === "issue" ? this.issueRow(t, row.issue)
        : row.kind === "project" ? this.projectRow(t, row.project) : this.notificationRow(t, row.notification);
      return div().h(ROW[row.kind]).py(1).child(div().h_full().px(10).rounded(8).flex().items_center()
        .border_l_2().border_color(on ? t.accent : t.popover)
        .when(on, (el) => el.bg(t.raised))
        .child(div().flex_1().min_w(0).child(body)));
    };
    const id = `list-${this.listKey()}`;
    return pane
      .child(v_virtual_list(id, rows.length, rows.map((r) => ROW[r.kind]), (i) => this.rowKey(rows[i]),
        (range) => rows.slice(range.start, range.end).map((r, n) => draw(r, range.start + n)))
        .track_scroll(this.listScroll).size_full()
        .on_item_click((key, cx) => {
          const i = rows.findIndex((r) => this.rowKey(r) === key);
          if (i < 0 || rows[i].kind === "section") return;
          this.select(rows, i);
          this.handle.focus();
          this.wantDetail(cx);
          cx.notify();
        }))
      .child(Scrollbar.vertical(id).absolute().inset_0());
  }

  // The detail as a column of blocks, each one step for J and K.
  issueBlocks(t, issue, note) {
    const d = this.details.get(issue.id);
    const state = stateOf(this.data, issue.stateId);
    const project = projectById(this.data, issue.projectId);
    const labels = issue.labelIds.map((id) => labelOf(this.data, id)).filter(Boolean);
    const blocks = [];
    if (note) blocks.push({ key: "note", el: () => div().pb(8).text_size(11.5).text_color(t.dim).child(note) });
    blocks.push({
      key: "head", el: () => v_flex().gap(4).pb(8)
        .child(div().text_size(11.5).text_color(t.dim).child(issue.identifier))
        .child(div().text_size(17).font_semibold().text_color(t.foreground).child(issue.title)),
    });
    blocks.push({
      key: "chips", el: () => h_flex().gap(6).pb(10).flex_wrap().items_center()
        .child(this.chip(t, state?.name ?? "No status", state?.color ?? t.muted))
        .child(this.chip(t, issue.assignee ? `@ ${issue.assignee.name}` : "Unassigned", issue.assignee ? t.foreground : t.dim))
        .when(!!project, (el) => el.child(this.chip(t, issue.milestone ? `${project.name} › ${issue.milestone}` : project.name, t.ansi4)))
        .children(labels.map((l) => this.chip(t, labelName(l), l.color)))
        .when(!!issue.parent, (el) => el.child(this.chip(t, `sub-issue of ${issue.parent}`)))
        .when(issue.priority > 0, (el) => el.child(this.chip(t, PRIORITY[issue.priority], t.ansi1)))
        .when(!!issue.creator, (el) => el.child(this.chip(t, `by ${issue.creator}`, t.dim))),
    });
    if (isPending(issue.id)) return [...blocks, { key: "saving", el: () => div().text_color(t.dim).child("Saving in Linear…") }];
    if (d?.error) return [...blocks, { key: "error", el: () => div().text_color(t.ansi1).child(`Couldn't load the description: ${d.error}`) }];
    if (!d?.detail && !this.client) return [...blocks, { key: "nokey", el: () => div().text_color(t.dim).child(`The description and comments load once ~/${KEY_FILE} exists.`) }];
    if (!d?.detail) return [...blocks, { key: "loading", el: () => div().text_color(t.dim).child("Loading…") }];
    const { detail } = d;
    for (const [i, a] of (detail.attachments?.nodes ?? []).entries()) {
      blocks.push({
        key: `link:${i}`, url: a.url, el: () => h_flex().gap(6).pb(4).items_center().text_size(12.5)
          .child(div().flex_none().text_color(t.accent).child("↗"))
          .child(div().flex_1().min_w(0).truncate().text_color(t.accent).child(a.title || a.url)),
      });
    }
    const text = detail.description?.trim();
    if (text) paragraphs(text).forEach((p, i) => blocks.push({ key: `d${i}`, el: () => div().pt(i ? 0 : 8).pb(6).child(TextView.markdown(`${issue.id}-d${i}`, p)) }));
    else blocks.push({ key: "nodesc", el: () => div().pt(8).text_color(t.dim).child("No description.") });
    const comments = [...(detail.comments?.nodes ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (comments.length) {
      blocks.push({ key: "comments", el: () => div().pt(14).pb(6).text_size(10.5).font_semibold().text_color(t.dim).child(`COMMENTS  ${comments.length}`) });
      for (const c of comments) {
        blocks.push({
          key: `c:${c.id}`, el: () => v_flex().gap(4).mb(8).p(10).rounded(8).bg(t.surface)
            .child(h_flex().gap(8).items_center()
              .child(div().font_semibold().text_size(12.5).text_color(isPending(c.id) ? t.muted : t.foreground).child(c.user?.name ?? "Someone"))
              .child(div().text_size(11).text_color(t.dim).child(isPending(c.id) ? "sending…" : ago(c.createdAt))))
            .child(TextView.markdown(`c-${c.id}`, cut(c.body ?? ""))),
        });
      }
    }
    return blocks;
  }

  projectBlocks(t, p) {
    const counts = workflow(this.data).filter((s) => OPEN_TYPES.includes(s.type))
      .map((s) => [s, this.data.issues.filter((i) => i.projectId === p.id && i.stateId === s.id).length]).filter(([, n]) => n > 0);
    const blocks = [
      { key: "head", el: () => div().pb(p.description ? 4 : 8).text_size(17).font_semibold().text_color(t.foreground).child(p.name) },
      ...(p.description ? [{ key: "summary", el: () => div().pb(8).text_color(t.muted).child(p.description) }] : []),
      {
        key: "chips", el: () => h_flex().gap(6).pb(10).flex_wrap()
          .child(this.chip(t, p.status.name, this.projectColor(t, p.status.type)))
          .child(this.chip(t, p.lead ? `lead ${p.lead}` : "No lead", p.lead ? t.foreground : t.dim))
          .child(this.chip(t, `${Math.round(p.progress * 100)}% done`))
          .when(!!p.startDate, (el) => el.child(this.chip(t, `start ${p.startDate}`)))
          .when(!!p.targetDate, (el) => el.child(this.chip(t, `target ${p.targetDate}`))),
      },
    ];
    if (p.members.length) blocks.push({ key: "members", el: () => div().pb(8).text_size(12).text_color(t.muted).child(`Members: ${p.members.join(", ")}`) });
    if (p.milestones.length) {
      blocks.push({ key: "mh", el: () => div().pt(6).pb(4).text_size(10.5).font_semibold().text_color(t.dim).child("MILESTONES") });
      p.milestones.forEach((m, i) => blocks.push({
        key: `m${i}`, el: () => h_flex().gap(10).pb(4).items_center()
          .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(m.name))
          .child(div().flex_none().w(120).h(6).rounded(3).bg(t.raised).child(div().h_full().rounded(3).bg(t.ansi2).w(Math.round(120 * (m.progress ?? 0)))))
          .child(div().flex_none().w(40).text_size(11.5).text_color(t.muted).child(`${Math.round((m.progress ?? 0) * 100)}%`)),
      }));
    }
    blocks.push({ key: "ih", el: () => div().pt(10).pb(4).text_size(10.5).font_semibold().text_color(t.dim).child("OPEN ISSUES") });
    blocks.push({
      key: "counts", el: () => counts.length
        ? h_flex().gap(6).flex_wrap().children(counts.map(([s, n]) => this.chip(t, `${s.name} ${n}`, s.color)))
        : div().text_color(t.dim).child("None"),
    });
    if (!this.projectId) blocks.push({ key: "hint", el: () => div().pt(6).text_size(11.5).text_color(t.dim).child("↵ lists them") });
    const text = p.content?.trim();
    if (text) paragraphs(text).forEach((x, i) => blocks.push({ key: `d${i}`, el: () => div().pt(i ? 0 : 12).pb(6).child(TextView.markdown(`${p.id}-d${i}`, x)) }));
    else blocks.push({ key: "nodesc", el: () => div().pt(12).text_color(t.dim).child("No writeup in Linear.") });
    return blocks;
  }

  notificationBlocks(t, n) {
    const note = [n.subtitle, n.actor && !n.subtitle?.includes(n.actor) ? n.actor : null, ago(n.createdAt)].filter(Boolean).join(" · ");
    const issue = n.issueId ? this.rowIssue({ kind: "notification", notification: n }) : null;
    if (issue) return this.issueBlocks(t, issue, note);
    if (n.issueId && this.details.get(n.issueId)?.error) {
      return [{ key: "error", el: () => div().text_color(t.ansi1).child(`Couldn't load the issue: ${this.details.get(n.issueId).error}`) }];
    }
    if (n.issueId) return [{ key: "loading", el: () => div().text_color(t.dim).child("Loading…") }];
    return [
      { key: "head", el: () => div().pb(6).text_size(17).font_semibold().text_color(t.foreground).child(n.title ?? humanize(n.type)) },
      { key: "note", el: () => div().pb(10).text_color(t.muted).child(note || humanize(n.type)) },
      { key: "hint", el: () => div().text_size(11.5).text_color(t.dim).child(n.category === "reviews" || n.url?.includes("/review/") ? "A pull request review, mirrored from GitHub. o opens it in Linear." : "o opens it in Linear.") },
    ];
  }

  renderDetailBody(t, row) {
    const blocks = row.kind === "issue" ? this.issueBlocks(t, row.issue)
      : row.kind === "project" ? this.projectBlocks(t, row.project) : this.notificationBlocks(t, row.notification);
    this.detailCount = blocks.length;
    const at = this.detailAt === null ? -1 : Math.min(this.detailAt, blocks.length - 1);
    const id = `detail-${this.rowKey(row)}`;
    return v_flex().relative().flex_1().min_h(0)
      .child(v_flex().id(id).absolute().inset_0().overflow_y_scroll().track_scroll(this.detailScroll)
        .children(blocks.map((b, i) => div().id(`b-${b.key}`).flex_none().pl(10).border_l_2()
          .border_color(i === at ? t.accent : t.background)
          .when(!!b.url, (el) => el.cursor_pointer().on_click(() => exec("open", [b.url]).catch(() => {})))
          .child(b.el()))))
      .child(Scrollbar.vertical(id).absolute().inset_0());
  }

  renderHelp(t) {
    const keys = this.helpSearch.filter(KEYS);
    const groups = [...new Set(keys.map((k) => k.group))];
    const box = this.helpSearch.box(t, keys.length);
    const flow = this.data ? workflow(this.data).map((s) => s.name) : [];
    return v_flex().id("help").flex_1().min_h(0).gap(14).p(4).overflow_y_scrollbar()
      .child(div().text_size(14).font_semibold().text_color(t.foreground).child("Keys"))
      .when(!!box, (el) => el.child(box))
      .child(h_flex().gap(28).items_start().flex_wrap().children(groups.map((g) => v_flex().gap(4).min_w(220)
        .child(div().text_size(10.5).font_semibold().text_color(t.dim).child(g.toUpperCase()))
        .children(keys.filter((k) => k.group === g).map((k) => h_flex().gap(8).items_center()
          .child(h_flex().gap(3).w(70).flex_none().children(k.keys.map((x) => this.keyChip(t, x))))
          .child(div().text_size(12).text_color(t.muted).child(k.label)))))))
      .child(div().text_size(11.5).text_color(t.dim).child("Issue keys act on the selected issue, or on a notification's issue. Changes show at once and go back if Linear refuses them. / searches the keys; any other key closes this."))
      .child(v_flex().gap(4)
        .child(div().text_size(10.5).font_semibold().text_color(t.dim).child("HOW THE TEAM USES LINEAR"))
        .when(flow.length > 0, (el) => el.child(div().text_size(12).text_color(t.muted).child(`Issues move ${flow.join(" → ")}.`)))
        .child(div().text_size(12).text_color(t.muted).child("Projects group issues toward a goal; milestones split a project into stages.")));
  }

  renderPicker(t) {
    const { kind, issue } = this.picker;
    const items = this.pickerList();
    const at = Math.min(this.picker.at, Math.max(0, items.length - 1));
    const rows = items.map((x, i) => h_flex().id(`pick-${x.id ?? "none"}`).flex_none().gap(8).px(10).h(28).rounded(6).items_center()
      .when(i === at, (el) => el.bg(t.raised))
      .on_click((_e, cx) => { this.pick(cx, i); this.query?.focus(); })
      .child(x.check
        ? div().flex_none().size(14).rounded(3).border_1().border_color(x.on ? t.accent : t.border).bg(x.on ? t.accent : t.background)
          .flex().items_center().justify_center().text_size(10).text_color(t.background).child(x.on ? "✓" : "")
        : div().flex_none().w(14).text_color(t.accent).child(x.on ? "✓" : ""))
      .when(!!x.color, (el) => el.child(this.dot(x.color)))
      .child(div().flex_1().truncate().text_color(x.on ? t.foreground : t.muted).child(x.title))
      .when(!!x.note, (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(x.note))));
    return v_flex().flex_1().min_h(0).gap(10)
      .child(h_flex().flex_none().gap(8).items_center()
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child(PICKERS[kind].title))
        .child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t.dim).child(`${issue.identifier} ${issue.title}`)))
      .child(h_flex().h(32).flex_none().px(10).rounded(8).border_1().border_color(t.accent).bg(t.background).items_center()
        .child(Input.new(this.query).flex_1().h_full().text_size(12.5).text_color(t.foreground)))
      .child(v_flex().id("picker").flex_1().min_h(0).gap(1).overflow_y_scrollbar().track_scroll(this.pickerScroll).children(rows))
      .child(div().flex_none().text_size(11.5).text_color(t.dim).child(`↑↓ choose · ${PICKERS[kind].hint} · Esc back`));
  }

  renderComposer(t) {
    const { issue } = this.compose;
    return v_flex().flex_none().gap(8).p(10).rounded(8).border_1().border_color(t.accent).bg(t.popover)
      .child(h_flex().gap(8).items_center()
        .child(div().font_semibold().text_color(t.foreground).child(`Comment on ${issue.identifier}`))
        .child(div().flex_1())
        .child(div().text_size(11).text_color(t.dim).child("↵ send · ⇧↵ newline · Esc")))
      .child(Textarea.new(this.comment).w_full().text_size(12.5).text_color(t.foreground));
  }

  renderDetail(t) {
    const pane = v_flex().flex_1().min_w(0).h_full().px(24).pt(18).pb(10).gap(10).rounded(10).bg(t.background).border_1().border_color(t.border);
    if (this.help) return pane.child(this.renderHelp(t));
    if (this.picker) return pane.child(this.renderPicker(t));
    if (this.route) {
      return pane.child(renderPicker(t, this.routeRows(), this.route.at, {
        title: "Send to a session",
        subtitle: this.routeText(this.route.row),
        footer: this.routeSearch.active ? "↑↓ or ⌃j/⌃k choose · ↵ sends · Esc clear search" : "j/k choose · / search · ↵ sends · Esc back",
        scroll: this.routeScroll,
        search: this.routeSearch,
        onPick: (i, cx) => this.pickSession(cx, i),
      }));
    }
    const row = this.selected();
    if (!row) return this.centered(t, pane, this.data ? "Nothing selected" : "Loading…", null, t.dim);
    return pane.child(this.renderDetailBody(t, row)).when(!!this.compose, (el) => el.child(this.renderComposer(t)));
  }

  renderMain(t) {
    if (!this.data) {
      const pane = v_flex().flex_1().min_h(0).rounded(10).bg(t.background).border_1().border_color(t.border);
      if (this.keyMissing) return this.centered(t, pane, "Linear needs an API key", `Put a personal API key in ~/${KEY_FILE} (docs/herdr.md) · ⌃R retries`);
      if (this.loadError) return this.centered(t, pane, "Couldn't load Linear", `${this.loadError} · ⌃R retries`, t.ansi1);
      return this.centered(t, pane, "Loading…");
    }
    if (this.help) return this.renderDetail(t);
    return h_flex().flex_1().min_h(0).gap(12).child(this.renderList(t)).child(this.renderDetail(t));
  }

  renderBar(t) {
    if (this.prompt) {
      const project = projectById(this.data, this.prompt.projectId);
      return h_flex().flex_none().gap(10).items_center()
        .child(div().flex_none().text_size(12.5).font_semibold().text_color(t.foreground).child(project ? `New issue in ${project.name}` : "New issue"))
        .child(h_flex().flex_1().h(32).px(10).rounded(8).border_1().border_color(t.accent).bg(t.background).items_center()
          .child(Input.new(this.text).flex_1().h_full().text_size(12.5).text_color(t.foreground)))
        .child(div().flex_none().text_size(11.5).text_color(t.dim).child("↵ create · Esc cancel"));
    }
    return null;
  }

  renderFooter(t) {
    const missing = this.keyMissing && this.data ? `No API key in ~/${KEY_FILE}` : null;
    const error = this.note ? null : missing ?? (this.loadError && this.data ? this.loadError : null);
    const status = this.note
      ? { text: this.note.text, color: { error: t.ansi1, success: t.ansi2 }[this.note.level] ?? t.muted }
      : error ? { text: error, color: t.ansi1 } : null;
    const hasIssue = Boolean(this.data && this.rowIssue(this.selected()));
    return v_flex().flex_none().w_full().gap(6).pt(2)
      .when(!!status, (el) => el.child(div().truncate().text_size(11.5).text_color(status.color).child(status.text)))
      .child(h_flex().w_full().flex_wrap().gap_x(12).gap_y(4).items_center()
        .children(KEYS.filter((k) => k.footer && (!k.views || k.views.includes(this.view)) && (!k.issue || hasIssue))
          .map((k) => h_flex().gap(5).items_center().child(this.keyChip(t, k.keys[0])).child(div().text_size(11.5).text_color(t.muted).child(k.label)))));
  }

  renderTabs(t) {
    const count = (view) => {
      if (!this.data) return null;
      if (view === "inbox") return this.data.notifications.filter((n) => !n.readAt).length || null;
      if (view === "issues") return this.data.issues.length;
      return this.data.projects.filter((p) => !isDoneProject(p)).length;
    };
    return h_flex().gap(4).items_center().children(VIEWS.map(([view, title]) => {
      const on = view === this.view;
      const n = count(view);
      return h_flex().id(`view-${view}`).gap(6).px(10).h(24).rounded(12).items_center()
        .when(on, (el) => el.bg(t.raised))
        .on_click((_e, cx) => { this.setView(cx, view); this.handle.focus(); this.wantDetail(cx); })
        .child(div().text_size(12.5).text_color(on ? t.foreground : t.muted).child(title))
        .when(n !== null, (el) => el.child(div().text_size(11).text_color(view === "inbox" ? t.accent : t.dim).child(String(n))));
    }));
  }

  render() {
    const t = theme();
    const bar = this.renderBar(t);
    const project = this.view === "projects" && this.data ? projectById(this.data, this.projectId) : null;
    const showFilter = this.filtering || Boolean(this.filter.value());
    return v_flex()
      .id("linear")
      .track_focus(this.handle)
      .when(this.stepping(), (el) => el.on_action("overlay.close", (_e, cx) => {
        this.back(cx);
        cx.stop_propagation();
      }))
      .key_context("LinearDialog")
      .on_action("linear_next_view", (_e, cx) => this.key({ key: "tab", modifiers: {} }, cx))
      .on_action("linear_prev_view", (_e, cx) => this.key({ key: "tab", modifiers: { shift: true } }, cx))
      .on_key_down((e, cx) => this.key(e, cx))
      .size_full()
      .p(16)
      .gap(12)
      .bg(t.popover)
      .text_size(13)
      .child(h_flex().flex_none().items_center().gap(14)
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Linear"))
        .child(this.renderTabs(t))
        .when(!!project, (el) => el.child(h_flex().gap(6).items_center().text_size(12.5)
          .child(div().text_color(t.dim).child("›"))
          .child(div().text_color(t.foreground).child(project.name))
          .child(div().text_size(11).text_color(t.dim).child("Esc back"))))
        .child(div().flex_1())
        .when(showFilter, (el) => el.child(h_flex().w(320).h(28).px(10).rounded(8).border_1()
          .border_color(this.filtering ? t.accent : t.border).bg(t.background).items_center()
          .child(Input.new(this.filter).flex_1().h_full().text_size(12).text_color(t.foreground))))
        .when(this.loading, (el) => el.child(div().text_size(11.5).text_color(t.dim).child("refreshing…"))))
      .child(this.renderMain(t))
      .when(!!bar, (el) => el.child(bar))
      .child(this.renderFooter(t));
  }
}
