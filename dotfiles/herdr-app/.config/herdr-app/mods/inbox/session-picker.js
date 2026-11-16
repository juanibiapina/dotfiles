// A session picker that looks like the workbench sidebar: every space with its
// sessions, in the sidebar's order and with its rows, then snoozed sessions,
// then ways to start a new session. j/k move, ↵ picks, / opens a search box
// that fuzzy filters the rows; while it has the keyboard the arrows, ⌃n/⌃p and
// ⌃j/⌃k move, ↵ picks and Escape clears and leaves the search. The
// host owns a PickerSearch, passes its keys through pickerKey(), calls move()
// and the pick it passed in, and goes back on Escape when search.stop() is false.
//
// The order and the row drawing mirror mods/workbench/main.js; change both
// together. A mod can only import files inside its own folder, so
// scripts/link-dotfiles.bash copies this file into the mail and switch mods.

import { div, image, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { agents, terminals, spaces, exec } from "herdr";

// dev factory pickup labels its terminals herdr.space=factory-<clone>.
const isFactory = (s) => (s.id.split("/").pop()).startsWith("factory-");
// The notes space on mini, opened with ctrl-space o (mods/notes).
const isNotes = (s) => s.machine === "mini" && s.named && s.name === "notes";
// `dev herdr snooze` labels a snoozed session juan.snooze=<its waiter>.
const snoozedSet = () => new Set(terminals().filter((k) => k.labels?.["juan.snooze"]).map((k) => k.address));
const byName = (a, b) => (a || "").localeCompare(b || "", undefined, { sensitivity: "base", numeric: true });

function sortedSpaces(all, snoozed) {
  const allSnoozed = (s) => {
    const members = all.filter((a) => a.space === s.id);
    return members.length > 0 && members.every((a) => snoozed.has(a.address));
  };
  return spaces().filter((s) => s.active || (!isFactory(s) && !isNotes(s) && !allSnoozed(s))).sort((a, b) =>
    (a.machine !== null) - (b.machine !== null) || byName(a.machine, b.machine) ||
    isFactory(a) - isFactory(b) || byName(a.name, b.name));
}

const agentName = (a, reports) => reports.get(a.address) || (a.tab_name && !/^\d+$/.test(a.tab_name) ? a.tab_name : a.program?.name || a.title);

// Whether every character of query appears in text, in order.
function fuzzy(text, query) {
  const t = text.toLowerCase();
  let at = 0;
  for (const ch of query.toLowerCase().replace(/\s+/g, "")) {
    at = t.indexOf(ch, at) + 1;
    if (!at) return false;
  }
  return true;
}

const MOVE = { down: 1, "ctrl-n": 1, "ctrl-j": 1, up: -1, "ctrl-p": -1, "ctrl-k": -1 };

// The search box. onChange runs on every edit, onSubmit on ↵ while it has the
// keyboard; handle is the host's focus handle, which gets the keyboard back.
export class PickerSearch {
  constructor(handle, { onChange, onSubmit }) {
    this.handle = handle;
    this.active = false;
    this.input = InputState.new({ placeholder: "Search sessions…" });
    this.input.on("change", (e, cx) => onChange(e, cx));
    this.input.on("submit", (e, cx) => onSubmit(e, cx));
  }

  value() { return this.input.value(); }

  // A fresh picker: no filter, the list has the keyboard.
  reset() {
    this.input.set_value("");
    this.active = false;
    this.handle.focus();
  }

  start() {
    this.active = true;
    this.input.focus();
  }

  // Clears and leaves the search box. False when it wasn't open.
  stop() {
    if (!this.active) return false;
    this.active = false;
    this.input.set_value("");
    this.handle.focus();
    return true;
  }
}

// What a key does in the picker: { move: ±1 }, { pick: true }, { search: true },
// or {} for keys the picker leaves alone (typing, while searching).
export function pickerKey(search, k) {
  if (search.active) return MOVE[k] ? { move: MOVE[k] } : {};
  if (k === "/") return { search: true };
  if (k === "enter") return { pick: true };
  const move = MOVE[k] ?? { j: 1, k: -1 }[k];
  return move ? { move } : {};
}

// The picker's rows. Sessions and starts can be picked; spaces and headings
// only label them. starts: [{ title, detail?, value }] for new sessions.
// query keeps the sessions whose name, space or machine fuzzy match it, and
// the starts whose title or detail do.
export function pickerRows(starts = [], query = "") {
  const all = agents();
  const snoozed = snoozedSet();
  const reports = new Map(terminals().map((k) => [k.address, k.report?.msg]));
  const machineOf = new Map(spaces().map((s) => [s.id, s.machine ?? null]));
  const session = (a, extra = {}) => ({ kind: "session", agent: a, name: agentName(a, reports), machine: machineOf.get(a.space) ?? null, ...extra });
  const spaceOf = new Map(spaces().map((s) => [s.id, s]));
  const hit = (a) => !query || fuzzy([agentName(a, reports), spaceOf.get(a.space)?.name ?? a.space_name, machineOf.get(a.space)].filter(Boolean).join(" "), query);
  const rows = [];
  for (const s of sortedSpaces(all, snoozed)) {
    const members = all.filter((a) => a.space === s.id && !snoozed.has(a.address) && hit(a));
    if (!members.length) continue;
    rows.push({ kind: "space", space: s });
    for (const a of members) rows.push(session(a));
  }
  const asleep = all.filter((a) => snoozed.has(a.address) && hit(a));
  if (asleep.length) {
    rows.push({ kind: "heading", text: "Snoozed" });
    for (const a of asleep) rows.push(session(a, { snoozed: true }));
  }
  const fresh = starts.filter((s) => !query || fuzzy(`${s.title} ${s.detail ?? ""}`, query));
  if (fresh.length) {
    rows.push({ kind: "heading", text: "New session" });
    for (const s of fresh) rows.push({ kind: "start", ...s });
  }
  return rows;
}

const pickable = (row) => row?.kind === "session" || row?.kind === "start";

// The first pickable row at or after `at`, or the first one.
export function settle(rows, at = 0) {
  for (let i = Math.max(0, at); i < rows.length; i++) if (pickable(rows[i])) return i;
  return rows.findIndex(pickable);
}

// The next (delta 1) or previous (-1) pickable row from `at`, staying put at the ends.
export function move(rows, at, delta) {
  for (let i = at + delta; i >= 0 && i < rows.length; i += delta) if (pickable(rows[i])) return i;
  return at;
}

// Hands text to a session's agent. A snoozed one wakes first (dev herdr wake, on its machine).
export async function deliver(row, text) {
  const a = row.agent;
  if (row.snoozed) {
    const r = await exec("dev", ["herdr", "wake", a.address.split("/").pop()], { on: row.machine });
    if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || "dev herdr wake failed");
  }
  const r = await exec("hc", ["send", a.address, text]);
  if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || "hc send failed");
}

function programIcon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

function status(t, s) {
  if (s === "working") return svg("mods/workspace-chrome/spinner.svg").size(12).mx(1).flex_none().text_color(t.working).spin(900);
  if (s === "blocked") return div().size(14).flex_none().rounded(4).bg(t.blocked + "26").text_size(10.5).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!");
  if (s === "done") return div().size(7).mx(3).flex_none().rounded(4).bg(t.done);
  return div().size(7).mx(3).flex_none().rounded(4).border(1.5).border_color(t.idle ?? t.dim);
}

// The rows as elements, one child per row so scroll.scroll_to_item(at) shows
// the picked one. note(row) adds a word on a session's right (why it fits).
export function renderRows(t, rows, at, { onPick, note } = {}) {
  return rows.map((r, i) => {
    if (r.kind === "space") {
      const s = r.space;
      const color = { blocked: t.blocked, done: t.done }[s.status] ?? (s.active ? t.accent : t.accent + "99");
      return h_flex().id(`pk-sp-${i}`).px(8).pt(4).h(24).flex_none().items_center().gap(6)
        .text_size(11).text_color(color).when(s.active, (el) => el.font_semibold())
        .child(div().flex_1().min_w(0).truncate().child(s.name || ""))
        .when(isFactory(s), (el) => el.child(div().flex_none().px(5).rounded(4).bg(t.accent + "26").text_size(10).font_normal().text_color(t.accent).child("factory")))
        .when(Boolean(s.machine), (el) => el.child(div().flex_none().font_normal().text_color(t.ansi6).child(s.machine)));
    }
    if (r.kind === "heading") {
      return h_flex().id(`pk-h-${i}`).px(8).pt(4).h(24).flex_none().items_center().text_size(11).text_color(t.dim).child(r.text);
    }
    const on = i === at;
    const base = h_flex().id(`pk-${i}`).h(28).px(8).gap(8).flex_none().rounded(7).items_center().text_size(12.5).cursor_pointer()
      .when(on, (el) => el.bg(t.selected))
      .hover((s) => s.bg(t.hover))
      .when(Boolean(onPick), (el) => el.on_click((_e, cx) => onPick(i, cx)));
    if (r.kind === "start") {
      return base
        .child(div().w(14).flex_none().text_color(t.accent).child("+"))
        .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(r.title))
        .when(Boolean(r.detail), (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(r.detail)));
    }
    const a = r.agent;
    const word = note?.(r);
    const row = base
      .child(programIcon(a.program, 14, r.snoozed ? t.dim : t.muted) ?? div().w(14).flex_none())
      .child(div().flex_1().min_w(0).truncate().text_color(r.snoozed ? t.muted : t.foreground).child(r.name))
      .when(Boolean(word), (el) => el.child(div().flex_none().text_size(11).text_color(t.accent).child(word)))
      .when(r.snoozed, (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child([a.space_name, r.machine].filter(Boolean).join(" · "))))
      .child(status(t, a.status));
    return r.snoozed ? div().opacity(0.6).child(row) : row;
  });
}

// The picker panel: a title, the search box, the rows in a scroll area, and a hint line.
export function renderPicker(t, rows, at, { title, subtitle, footer, scroll, search, onPick, note }) {
  return v_flex().flex_1().min_h(0).gap(8)
    .child(h_flex().flex_none().gap(8).items_center()
      .child(div().flex_none().text_size(15).font_semibold().text_color(t.foreground).child(title))
      .when(Boolean(subtitle), (el) => el.child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t.dim).child(subtitle))))
    .when(Boolean(search && (search.active || search.value())), (el) => el.child(h_flex().h(32).flex_none().px(10).rounded(8).border_1()
      .border_color(search.active ? t.accent : t.border).bg(t.background).items_center()
      .child(Input.new(search.input).flex_1().h_full().text_size(12.5).text_color(t.foreground))))
    .child(v_flex().id("session-picker").flex_1().min_h(0).overflow_y_scrollbar().track_scroll(scroll)
      .children(rows.length ? renderRows(t, rows, at, { onPick, note }) : [div().px(8).h(28).text_color(t.dim).child(search?.value() ? "No match" : "No sessions")]))
    .when(Boolean(footer), (el) => el.child(div().flex_none().text_size(11.5).text_color(t.dim).child(footer)));
}
