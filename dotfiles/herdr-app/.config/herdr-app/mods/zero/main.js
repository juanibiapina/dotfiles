// Zero's todo app in a dialog: Today, All and Projects, changed with vim-like
// keys through zero-todo. Every change shows at once and goes back if Zero
// refuses it. KEYS is the list of what every key does; the footer and the ?
// sheet are drawn from it.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, ScrollHandle, InputState, Input } from "gpui-base";
import { theme, props, closeOverlay, shared, setShared } from "herdr";
import * as zero from "./zero.js";
import { parseSchedule, fromLists, taskRows, projectRows, projectTasks, projectIdOf, isFuture, applyChange, STATE_TITLES } from "./model.js";

const VIEWS = [["today", "Today"], ["all", "All"], ["projects", "Projects"]];
const TASKS = ["today", "all"];
const PROJECTS = ["projects"];

const KEYS = [
  { keys: ["j", "down"], label: "next", group: "Move", act: "next" },
  { keys: ["k", "up"], label: "previous", group: "Move", act: "prev" },
  { keys: ["tab"], label: "next view", group: "Move", act: "nextView", footer: true },
  { keys: ["shift-tab"], label: "previous view", group: "Move", act: "prevView" },
  { keys: ["c"], label: "new Task", group: "Tasks", act: "addTask", footer: true },
  { keys: ["r", "enter"], label: "edit text", group: "Tasks", act: "renameTask", views: TASKS, footer: true },
  { keys: ["s"], label: "schedule", group: "Tasks", act: "schedule", views: TASKS, footer: true },
  { keys: ["m"], label: "move to a Project", group: "Tasks", act: "move", views: TASKS, footer: true },
  { keys: ["x"], label: "complete", group: "Tasks", act: "complete", views: TASKS, footer: true },
  { keys: ["z"], label: "reopen last completed", group: "Tasks", act: "undo", views: TASKS },
  { keys: ["C"], label: "new Project", group: "Projects", act: "addProject", views: PROJECTS, footer: true },
  { keys: ["r"], label: "rename", group: "Projects", act: "renameProject", views: PROJECTS, footer: true },
  { keys: ["enter"], label: "its Tasks in All", group: "Projects", act: "openProject", views: PROJECTS, footer: true },
  { keys: ["b"], label: "backlog / in play", group: "Projects", act: "backlog", views: PROJECTS, footer: true },
  { keys: ["d"], label: "done", group: "Projects", act: "done", views: PROJECTS, footer: true },
  { keys: ["#"], label: "delete", group: "Projects", act: "delete", views: PROJECTS },
  { keys: ["D"], label: "show done Projects", group: "Projects", act: "showDone", views: PROJECTS },
  { keys: ["ctrl-r"], label: "reload", group: "Other", act: "reload" },
  { keys: ["?"], label: "all keys", group: "Other", act: "help", footer: true },
  { keys: ["q", "escape"], label: "close", group: "Other", act: "close" },
];
const KEY_LABEL = { down: "↓", up: "↑", enter: "↵", escape: "Esc", tab: "Tab", "shift-tab": "⇧Tab", "ctrl-r": "⌃R" };

const PROMPTS = {
  addTask: { title: "New Task", placeholder: "What to do" },
  renameTask: { title: "Edit Task", placeholder: "Task text" },
  schedule: { title: "Schedule", placeholder: "YYYY-MM-DD, +N days, tomorrow, or empty to clear" },
  addProject: { title: "New Project", placeholder: "Project title" },
  renameProject: { title: "Rename Project", placeholder: "Project title" },
};

function keyName(e) {
  const m = e.modifiers ?? {};
  if (m.control) return `ctrl-${e.key}`;
  if (m.platform) return `cmd-${e.key}`;
  if (e.key === "tab") return m.shift ? "shift-tab" : "tab";
  if (["down", "up", "enter", "escape"].includes(e.key)) return e.key;
  return e.key_char || e.key;
}

const errorText = (e) => String(e?.message ?? e);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayText = (date) => {
  const [y, m, d] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}${y === new Date().getFullYear() ? "" : ` ${y}`}`;
};
let pendingIds = 0;
const isPending = (id) => String(id).startsWith("pending-");

export default class Zero extends View {
  init(_props, cx) {
    const cached = shared("zero.lists");
    this.data = cached?.tasks ? { today: cached.today, tasks: cached.tasks, home: cached.home, projects: cached.projects } : null;
    this.view = cached?.view ?? "today";
    this.sel = cached?.selected ?? {}; // view → { id, at }
    this.filter = null; // the Project id All shows, after Enter on a Project
    this.showDone = false;
    this.loading = false;
    this.loadError = cached?.status ?? null;
    this.refreshQueued = false;
    this.note = null; // { text, level } in the footer until the next key
    this.help = false;
    this.prompt = null; // { kind, id, projectId } while an input box is open
    this.picker = null; // { id, at } while the Project picker is open
    this.confirm = null; // { project, count } while a delete waits for y or n
    this.undo = null; // the last one-off Task completed here
    this.handle = cx.focus_handle();
    this.text = null; // the input box's state, made new for each prompt
    this.query = InputState.new({ placeholder: "Move to…" });
    this.query.on("change", (_e, cx) => { if (this.picker) this.picker.at = 0; cx.notify(); });
    this.query.on("submit", (_e, cx) => this.pickProject(cx));
    this.listScroll = ScrollHandle.new();
    this.pickerScroll = ScrollHandle.new();
    cx.timer.after(0, () => this.handle.focus());
    this.refresh(cx);
  }

  // ---- Zero ----

  save() {
    setShared("zero.lists", { view: this.view, ...this.data, selected: this.sel, status: this.loadError });
  }

  // Reads the lists again once every queued write is done. A refresh that ends
  // while writes wait behind it is dropped: the last write refreshes again.
  refresh(cx) {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    this.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const lists = await zero.enqueue(() => {
          this.refreshQueued = false;
          return zero.lists();
        });
        if (zero.pending() === 0) {
          this.data = fromLists(lists);
          this.loadError = null;
          this.save();
        }
      } catch (e) {
        this.loadError = errorText(e);
      }
      this.loading = this.refreshQueued;
      cx.notify();
    });
  }

  apply(change) {
    const { state, inverse } = applyChange(this.data, change);
    this.data = state;
    this.save();
    return inverse;
  }

  // Shows a change at once, sends it to Zero, and takes it back if Zero refuses.
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

  // ---- Lists and selection ----

  rows() {
    if (!this.data) return [];
    if (this.view === "projects") return projectRows(this.data, { showDone: this.showDone });
    return taskRows(this.data, this.view, { projectId: this.view === "all" ? this.filter : null })
      .map((task) => ({ kind: "task", task }));
  }

  selectable(row) {
    return row.kind !== "section";
  }

  rowId(row) {
    return row.kind === "task" ? row.task.id : row.project?.id;
  }

  // The selected row's index: the remembered item, else the row now where it was.
  index(rows = this.rows()) {
    const s = this.sel[this.view];
    let i = rows.findIndex((r) => this.rowId(r) === s?.id);
    if (i < 0) {
      i = Math.min(s?.at ?? 0, rows.length - 1);
      while (i >= 0 && !this.selectable(rows[i])) i++;
      if (i >= rows.length) i = rows.findIndex((r) => this.selectable(r));
    }
    return i;
  }

  selected() {
    const rows = this.rows();
    return rows[this.index(rows)] ?? null;
  }

  selectedTask() {
    const row = this.selected();
    return row?.kind === "task" ? row.task : null;
  }

  selectedProject() {
    const row = this.selected();
    return row?.kind === "project" ? row.project : null;
  }

  select(rows, i) {
    const row = rows[i];
    if (!row) return;
    this.sel = { ...this.sel, [this.view]: { id: this.rowId(row), at: i } };
    this.listScroll.scroll_to_item(i);
  }

  move(cx, by) {
    const rows = this.rows();
    let i = this.index(rows);
    for (let j = i + by; j >= 0 && j < rows.length; j += by) {
      if (this.selectable(rows[j])) { i = j; break; }
    }
    this.select(rows, i);
    cx.notify();
  }

  setView(cx, view) {
    this.view = view;
    if (view !== "all") this.filter = null;
    this.save();
    cx.notify();
  }

  cycleView(cx, by) {
    const i = VIEWS.findIndex(([v]) => v === this.view);
    this.setView(cx, VIEWS[(i + by + VIEWS.length) % VIEWS.length][0]);
  }

  // Selects the row after the given one before it leaves the list.
  selectNextOf(id) {
    const rows = this.rows();
    const i = rows.findIndex((r) => this.rowId(r) === id);
    const next = rows.slice(i + 1).find((r) => this.selectable(r)) ?? rows.slice(0, i).reverse().find((r) => this.selectable(r));
    this.sel = { ...this.sel, [this.view]: { id: next ? this.rowId(next) : null, at: i } };
  }

  projectOf(task) {
    const id = projectIdOf(task);
    return id ? this.data.projects.find((p) => p.id === id) ?? null : null;
  }

  // ---- Tasks ----

  ready(cx, id) {
    if (!isPending(id)) return true;
    this.flash(cx, "Still saving it in Zero…");
    return false;
  }

  addTask(cx, text) {
    const projectId = this.view === "projects" ? this.selectedProject()?.id ?? null : this.view === "all" ? this.filter : null;
    const task = {
      id: `pending-${++pendingIds}`, text, showUpDate: null, recurrence: null, recurrenceDate: null,
      parent: projectId ? { kind: "project", projectId } : null, recordingId: null,
      createdAt: new Date().toISOString(), completedAt: null,
    };
    const homeAt = this.view === "today" ? this.data.home.length : -1;
    const project = projectId && this.data.projects.find((p) => p.id === projectId);
    if (this.view !== "projects") this.sel = { ...this.sel, [this.view]: { id: task.id, at: 0 } };
    this.write(cx, { type: "addTask", task, at: 0, homeAt }, project ? `Added to ${project.title}` : "Added",
      () => zero.addTask(text, projectId),
      (body) => {
        if (this.sel[this.view]?.id === task.id) this.sel = { ...this.sel, [this.view]: { id: body.task.id, at: 0 } };
        return { type: "replaceTask", id: task.id, task: body.task };
      });
  }

  renameTask(cx, task, text) {
    if (text === task.text) return;
    this.write(cx, { type: "updateTask", id: task.id, patch: { text } }, "Renamed", () => zero.renameTask(task.id, text));
  }

  schedule(cx, task, input) {
    const parsed = parseSchedule(input, this.data.today);
    if (parsed.error) return this.flash(cx, parsed.error, "error");
    const after = { ...task, showUpDate: parsed.date };
    if (this.view === "today" && isFuture(this.data, after)) this.selectNextOf(task.id);
    const text = parsed.date ? `Scheduled for ${parsed.date === this.data.today ? "today" : dayText(parsed.date)}` : "Current every day";
    this.write(cx, { type: "updateTask", id: task.id, patch: { showUpDate: parsed.date } }, text, () => zero.scheduleTask(task.id, parsed.date));
  }

  moveTask(cx, task, project) {
    const projectId = project?.id ?? null;
    if (projectId === projectIdOf(task)) return;
    if (this.view === "all" && this.filter) this.selectNextOf(task.id);
    this.write(cx, { type: "updateTask", id: task.id, patch: { parent: projectId ? { kind: "project", projectId } : null } },
      project ? `Moved to ${project.title}` : "Moved out of its Project", () => zero.moveTask(task.id, projectId));
  }

  complete(cx, task) {
    this.selectNextOf(task.id);
    this.undo = task.recurrence ? null : task;
    this.write(cx, { type: "removeTask", id: task.id }, task.recurrence ? "Completed this occurrence" : "Completed · z reopens",
      () => zero.completeTask(task.id));
  }

  reopen(cx) {
    const task = this.undo;
    if (!task) return this.flash(cx, "Nothing to reopen");
    this.undo = null;
    this.sel = { ...this.sel, [this.view]: { id: task.id, at: 0 } };
    const homeAt = this.view === "today" ? 0 : -1;
    this.write(cx, { type: "addTask", task, at: 0, homeAt }, "Reopened", () => zero.reopenTask(task.id));
  }

  // ---- Projects ----

  addProject(cx, title) {
    const project = {
      id: `pending-${++pendingIds}`, title, icon: "📁", description: null, state: "in-play", attention: "active",
      createdAt: new Date().toISOString(),
    };
    this.sel = { ...this.sel, projects: { id: project.id, at: 0 } };
    this.write(cx, { type: "addProject", project, at: 0 }, "Project added", () => zero.addProject(title),
      (body) => {
        if (this.sel.projects?.id === project.id) this.sel = { ...this.sel, projects: { id: body.project.id, at: 0 } };
        return { type: "replaceProject", id: project.id, project: body.project };
      });
  }

  renameProject(cx, project, title) {
    if (title === project.title) return;
    this.write(cx, { type: "updateProject", id: project.id, patch: { title } }, "Renamed", () => zero.renameProject(project.id, title));
  }

  setState(cx, project, state) {
    if (project.state === state) return;
    if (state === "done" && !this.showDone) this.selectNextOf(project.id);
    const text = { "in-play": "In play", backlog: "Moved to the backlog", done: "Done" }[state];
    this.write(cx, { type: "updateProject", id: project.id, patch: { state } }, text, () => zero.setProjectState(project.id, state));
  }

  deleteProject(cx, project) {
    this.selectNextOf(project.id);
    this.write(cx, { type: "removeProject", id: project.id }, `Deleted ${project.title}`, () => zero.deleteProject(project.id));
  }

  // ---- Input box and Project picker ----

  openPrompt(cx, kind, value = "", target = null) {
    this.prompt = { kind, target };
    this.text = InputState.new({ placeholder: PROMPTS[kind].placeholder });
    this.text.on("submit", (_e, cx) => this.submitPrompt(cx));
    this.text.set_value(value);
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
    const value = this.text.value().trim();
    this.closePrompt(cx);
    if (!value && p.kind !== "schedule") return;
    switch (p.kind) {
      case "addTask": return this.addTask(cx, value);
      case "renameTask": return this.renameTask(cx, p.target, value);
      case "schedule": return this.schedule(cx, p.target, value);
      case "addProject": return this.addProject(cx, value);
      case "renameProject": return this.renameProject(cx, p.target, value);
    }
  }

  openPicker(cx, task) {
    this.picker = { task, at: 0 };
    this.query.set_value("");
    this.query.focus();
    cx.notify();
  }

  closePicker(cx) {
    this.picker = null;
    this.handle.focus();
    cx.notify();
  }

  pickerList() {
    const q = this.query.value().trim().toLowerCase();
    const open = this.data.projects.filter((p) => p.state !== "done");
    const all = [null, ...open];
    return q ? all.filter((p) => (p ? `${p.icon} ${p.title}` : "No project").toLowerCase().includes(q)) : all;
  }

  pickProject(cx, i = this.picker?.at) {
    const list = this.pickerList();
    if (!this.picker || i < 0 || i >= list.length) return;
    const { task } = this.picker;
    this.closePicker(cx);
    this.moveTask(cx, task, list[i]);
  }

  // ---- Keys ----

  // Escape is Herdr's overlay.close binding, which runs before key handlers.
  // While a box, picker, question or the help sheet is open, or All shows one
  // Project, the root takes that action and goes back one step.
  back(cx) {
    if (this.prompt) this.closePrompt(cx);
    else if (this.picker) this.closePicker(cx);
    else if (this.confirm) { this.confirm = null; cx.notify(); }
    else if (this.help) { this.help = false; cx.notify(); }
    else if (this.view === "all" && this.filter) { this.filter = null; cx.notify(); }
  }

  key(e, cx) {
    const k = keyName(e);
    if (this.prompt) return;
    if (this.help) {
      cx.stop_propagation();
      this.help = false;
      return cx.notify();
    }
    if (this.picker) {
      const n = this.pickerList().length || 1;
      if (k === "down" || k === "ctrl-n") this.picker.at = (this.picker.at + 1) % n;
      else if (k === "up" || k === "ctrl-p") this.picker.at = (this.picker.at + n - 1) % n;
      else return;
      cx.stop_propagation();
      return cx.notify();
    }
    if (this.confirm) {
      cx.stop_propagation();
      const { project } = this.confirm;
      this.confirm = null;
      if (k === "y") this.deleteProject(cx, project);
      return cx.notify();
    }
    const entry = KEYS.find((x) => x.keys.includes(k) && (!x.views || x.views.includes(this.view)));
    if (!entry) return;
    cx.stop_propagation();
    this.note = null;
    if (!this.data && !["close", "reload", "help", "nextView", "prevView"].includes(entry.act)) return cx.notify();
    const task = this.selectedTask();
    const project = this.selectedProject();
    switch (entry.act) {
      case "next": return this.move(cx, 1);
      case "prev": return this.move(cx, -1);
      case "nextView": return this.cycleView(cx, 1);
      case "prevView": return this.cycleView(cx, -1);
      case "addTask":
        if (this.view === "projects" && !project) return this.flash(cx, "Select a Project first");
        if (project && !this.ready(cx, project.id)) return;
        return this.openPrompt(cx, "addTask");
      case "renameTask": return task && this.ready(cx, task.id) && this.openPrompt(cx, "renameTask", task.text, task);
      case "schedule": return task && this.ready(cx, task.id) && this.openPrompt(cx, "schedule", task.showUpDate ?? "", task);
      case "move": return task && this.ready(cx, task.id) && this.openPicker(cx, task);
      case "complete": return task && this.ready(cx, task.id) && this.complete(cx, task);
      case "undo": return this.reopen(cx);
      case "addProject": return this.openPrompt(cx, "addProject");
      case "renameProject": return project && this.ready(cx, project.id) && this.openPrompt(cx, "renameProject", project.title, project);
      case "openProject":
        if (!project || !this.ready(cx, project.id)) return;
        this.filter = project.id;
        this.view = "all";
        return cx.notify();
      case "backlog": return project && this.ready(cx, project.id) && this.setState(cx, project, project.state === "backlog" ? "in-play" : "backlog");
      case "done": return project && this.ready(cx, project.id) && this.setState(cx, project, "done");
      case "delete":
        if (!project || !this.ready(cx, project.id)) return;
        this.confirm = { project, count: projectTasks(this.data, project.id).length };
        return cx.notify();
      case "showDone":
        this.showDone = !this.showDone;
        return this.flash(cx, this.showDone ? "Showing done Projects" : "Hiding done Projects");
      case "reload": return this.refresh(cx);
      case "help": this.help = true; return cx.notify();
      case "close": return closeOverlay(props().overlay);
    }
  }

  // ---- Drawing ----

  keyChip(t, k) {
    return div().flex_none().px(5).h(18).rounded(4).bg(t.raised).text_color(t.foreground).text_size(11).flex().items_center().child(KEY_LABEL[k] ?? k);
  }

  dateTag(t, task) {
    if (!task.showUpDate || task.showUpDate === this.data.today) return null;
    const future = isFuture(this.data, task);
    return div().flex_none().text_size(11).text_color(future ? t.accent : t.dim).child(dayText(task.showUpDate));
  }

  taskRow(t, task, on) {
    const project = this.projectOf(task);
    const pending = isPending(task.id);
    const date = this.dateTag(t, task);
    return h_flex().flex_1().min_w(0).gap(8).items_center()
      .child(div().flex_none().size(14).rounded(7).border_1().border_color(on ? t.accent : t.input))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(h_flex().gap(6).items_center()
          .child(div().flex_1().min_w(0).truncate().text_color(pending ? t.muted : t.foreground).child(task.text))
          .when(!!task.recurrence, (el) => el.child(div().flex_none().text_size(12).text_color(t.dim).child("↻")))
          .when(!!date, (el) => el.child(date)))
        .when(!!project && !(this.view === "all" && this.filter), (el) => el.child(div().truncate().text_size(11.5).text_color(t.dim)
          .child(`${project.icon} ${project.title}`))));
  }

  projectRow(t, project) {
    const count = projectTasks(this.data, project.id).length;
    return h_flex().flex_1().min_w(0).gap(8).items_center()
      .child(div().flex_none().w(20).child(project.icon))
      .child(div().flex_1().min_w(0).truncate().text_color(project.state === "done" ? t.muted : t.foreground).child(project.title))
      .when(count > 0, (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(String(count))));
  }

  renderList(t) {
    const rows = this.rows();
    const at = this.index(rows);
    const items = rows.map((row, i) => {
      if (row.kind === "section") {
        return div().flex_none().px(10).pt(i ? 12 : 2).pb(4).text_size(10.5).font_semibold().text_color(t.dim).child(row.title.toUpperCase());
      }
      const on = i === at;
      return h_flex().id(`row-${this.rowId(row)}`).flex_none().px(10).py(7).rounded(8)
        .border_l_2().border_color(on ? t.accent : t.popover)
        .when(on, (el) => el.bg(t.raised))
        .on_click((_e, cx) => { this.select(rows, i); this.handle.focus(); cx.notify(); })
        .child(row.kind === "task" ? this.taskRow(t, row.task, on) : this.projectRow(t, row.project));
    });
    return v_flex().id("zero-list").w(380).flex_none().h_full().gap(2).overflow_y_scrollbar().track_scroll(this.listScroll).children(items);
  }

  field(t, label, value) {
    return h_flex().gap(10).items_start()
      .child(div().flex_none().w(80).text_size(12).text_color(t.dim).child(label))
      .child(div().flex_1().min_w(0).text_size(12.5).text_color(t.foreground).child(value));
  }

  renderTask(t, task) {
    const project = this.projectOf(task);
    const date = !task.showUpDate ? "Every day" : task.showUpDate === this.data.today ? "Today" : dayText(task.showUpDate);
    return v_flex().gap(10)
      .child(div().text_size(17).font_semibold().text_color(t.foreground).child(task.text))
      .child(this.field(t, "Project", project ? `${project.icon} ${project.title}` : "None"))
      .child(this.field(t, "Shows up", date))
      .when(!!task.recurrence, (el) => el.child(this.field(t, "Repeats", `↻ ${task.recurrenceDate ? `this occurrence ${dayText(task.recurrenceDate)}` : "yes"}`)));
  }

  renderProject(t, project) {
    const tasks = projectTasks(this.data, project.id);
    const state = STATE_TITLES[project.state];
    return v_flex().gap(10).flex_1().min_h(0)
      .child(h_flex().gap(10).items_center()
        .child(div().text_size(20).child(project.icon))
        .child(div().text_size(17).font_semibold().text_color(t.foreground).child(project.title)))
      .child(h_flex().gap(6)
        .child(h_flex().px(7).h(20).rounded(10).items_center().bg(t.raised).text_size(11).text_color(t.muted).child(state))
        .when(!!project.attention && project.attention !== project.state, (el) => el.child(h_flex().px(7).h(20).rounded(10).items_center()
          .bg(t.raised).text_size(11).text_color(t.muted).child(project.attention))))
      .when(!!project.description, (el) => el.child(div().text_size(12.5).text_color(t.muted).child(project.description)))
      .child(div().pt(6).text_size(10.5).font_semibold().text_color(t.dim).child(`TASKS · ${tasks.length}`))
      .child(v_flex().id("project-tasks").flex_1().min_h(0).gap(4).overflow_y_scrollbar().children(tasks.map((task) => h_flex().gap(8).items_center()
        .child(div().flex_none().size(12).rounded(6).border_1().border_color(t.input))
        .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(t.foreground).child(task.text))
        .child(this.dateTag(t, task) ?? div()))));
  }

  renderHelp(t) {
    const groups = [...new Set(KEYS.map((k) => k.group))];
    return v_flex().flex_1().min_h(0).gap(14).p(4)
      .child(div().text_size(14).font_semibold().text_color(t.foreground).child("Keys"))
      .child(h_flex().gap(28).items_start().flex_wrap().children(groups.map((g) => v_flex().gap(4).min_w(220)
        .child(div().text_size(10.5).font_semibold().text_color(t.dim).child(g.toUpperCase()))
        .children(KEYS.filter((k) => k.group === g).map((k) => h_flex().gap(8).items_center()
          .child(h_flex().gap(3).w(70).flex_none().children(k.keys.map((x) => this.keyChip(t, x))))
          .child(div().text_size(12).text_color(t.muted).child(k.label)))))))
      .child(div().text_size(11.5).text_color(t.dim).child("In Projects, c adds a Task to the selected Project. Changes show at once and go back if Zero refuses them. z reopens the last one-off Task completed here. Any key closes this."));
  }

  renderPicker(t) {
    const list = this.pickerList();
    const at = Math.min(this.picker.at, Math.max(0, list.length - 1));
    const current = projectIdOf(this.picker.task);
    const rows = list.map((p, i) => h_flex().id(`pick-${p?.id ?? "none"}`).flex_none().gap(8).px(10).h(28).rounded(6).items_center()
      .when(i === at, (el) => el.bg(t.raised))
      .on_click((_e, cx) => this.pickProject(cx, i))
      .child(div().flex_none().w(20).child(p ? p.icon : "·"))
      .child(div().flex_1().truncate().text_color((p?.id ?? null) === current ? t.accent : t.foreground).child(p ? p.title : "No project"))
      .when(p?.state === "backlog", (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child("backlog"))));
    if (at >= 0 && at < list.length) this.pickerScroll.scroll_to_item(at);
    return v_flex().flex_1().min_h(0).gap(10)
      .child(h_flex().flex_none().gap(8).items_center()
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Move to"))
        .child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t.dim).child(this.picker.task.text)))
      .child(h_flex().h(32).flex_none().px(10).rounded(8).border_1().border_color(t.accent).bg(t.background).items_center()
        .child(Input.new(this.query).flex_1().h_full().text_size(12.5).text_color(t.foreground)))
      .child(v_flex().id("picker").flex_1().min_h(0).gap(1).overflow_y_scrollbar().track_scroll(this.pickerScroll).children(rows))
      .child(div().flex_none().text_size(11.5).text_color(t.dim).child("↑↓ choose · ↵ move · Esc back"));
  }

  renderDetail(t) {
    const detail = v_flex().flex_1().min_w(0).h_full().px(24).py(20).rounded(10).bg(t.background).border_1().border_color(t.border);
    const centered = (title, note, color = t.foreground) => detail.items_center().justify_center().gap(6)
      .child(div().text_size(18).font_semibold().text_color(color).child(title))
      .when(!!note, (el) => el.child(div().max_w(560).text_size(12).text_color(t.dim).child(note)));
    if (this.help) return detail.child(this.renderHelp(t));
    if (this.picker) return detail.child(this.renderPicker(t));
    if (!this.data) return this.loadError ? centered("Couldn't load Zero", `${this.loadError} · ⌃R retries`, t.ansi1) : centered("Loading…");
    const row = this.selected();
    if (row?.kind === "task") return detail.child(this.renderTask(t, row.task));
    if (row?.kind === "project") return detail.child(this.renderProject(t, row.project));
    const empty = { today: "Nothing on Today", all: "No open Tasks", projects: "No Projects" }[this.view];
    return centered(empty, "c adds one");
  }

  renderBar(t) {
    if (this.prompt) {
      const { title } = PROMPTS[this.prompt.kind];
      return h_flex().flex_none().gap(10).items_center()
        .child(div().flex_none().text_size(12.5).font_semibold().text_color(t.foreground).child(title))
        .child(h_flex().flex_1().h(32).px(10).rounded(8).border_1().border_color(t.accent).bg(t.background).items_center()
          .child(Input.new(this.text).flex_1().h_full().text_size(12.5).text_color(t.foreground)))
        .child(div().flex_none().text_size(11.5).text_color(t.dim).child("↵ save · Esc cancel"));
    }
    if (this.confirm) {
      const { project, count } = this.confirm;
      const tasks = count === 1 ? "its 1 Task" : `its ${count} Tasks`;
      return h_flex().flex_none().h(32).px(10).gap(10).rounded(8).items_center().bg(t.raised)
        .child(div().flex_1().text_size(12.5).text_color(t.foreground).child(`Delete ${project.icon} ${project.title} with ${tasks}?`))
        .child(div().flex_none().text_size(11.5).text_color(t.dim).child("y deletes · any other key keeps it"));
    }
    return null;
  }

  renderFooter(t) {
    const error = this.note ? null : this.loadError && this.data ? this.loadError : null;
    return h_flex().flex_none().gap(12).items_center().pt(2)
      .children(KEYS.filter((k) => k.footer && (!k.views || k.views.includes(this.view)))
        .map((k) => h_flex().gap(5).items_center().child(this.keyChip(t, k.keys[0])).child(div().text_size(11.5).text_color(t.muted).child(k.label))))
      .child(div().flex_1())
      .when(!!this.note, (el) => el.child(div().max_w(520).truncate().text_size(11.5)
        .text_color({ error: t.ansi1, success: t.ansi2 }[this.note.level] ?? t.muted).child(this.note.text)))
      .when(!!error, (el) => el.child(div().max_w(520).truncate().text_size(11.5).text_color(t.ansi1).child(error)));
  }

  renderTabs(t) {
    const count = (view) => (!this.data ? null : view === "projects"
      ? this.data.projects.filter((p) => p.state !== "done").length
      : taskRows(this.data, view).length);
    return h_flex().gap(4).items_center().children(VIEWS.map(([view, title]) => {
      const on = view === this.view;
      const n = count(view);
      return h_flex().id(`view-${view}`).gap(6).px(10).h(24).rounded(12).items_center()
        .when(on, (el) => el.bg(t.raised))
        .on_click((_e, cx) => { this.setView(cx, view); this.handle.focus(); })
        .child(div().text_size(12.5).text_color(on ? t.foreground : t.muted).child(title))
        .when(n !== null, (el) => el.child(div().text_size(11).text_color(t.dim).child(String(n))));
    }));
  }

  render() {
    const t = theme();
    const filter = this.view === "all" && this.filter ? this.data?.projects.find((p) => p.id === this.filter) : null;
    const stepping = Boolean(this.prompt || this.picker || this.confirm || this.help || filter);
    const bar = this.renderBar(t);
    return v_flex()
      .id("zero")
      .track_focus(this.handle)
      .when(stepping, (el) => el.on_action("overlay.close", (_e, cx) => {
        this.back(cx);
        cx.stop_propagation();
      }))
      .on_key_down((e, cx) => this.key(e, cx))
      .size_full()
      .p(16)
      .gap(12)
      .bg(t.popover)
      .text_size(13)
      .child(h_flex().flex_none().items_center().gap(14)
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Zero"))
        .child(this.renderTabs(t))
        .when(!!filter, (el) => el.child(h_flex().gap(6).px(8).h(22).rounded(11).items_center().bg(t.raised).text_size(11.5).text_color(t.muted)
          .child(`${filter.icon} ${filter.title}`).child(div().text_color(t.dim).child("Esc clears"))))
        .child(div().flex_1())
        .when(this.loading, (el) => el.child(div().text_size(11.5).text_color(t.dim).child("refreshing…"))))
      .child(h_flex().flex_1().min_h(0).gap(12).child(this.renderList(t)).child(this.renderDetail(t)))
      .when(!!bar, (el) => el.child(bar))
      .child(this.renderFooter(t));
  }
}
