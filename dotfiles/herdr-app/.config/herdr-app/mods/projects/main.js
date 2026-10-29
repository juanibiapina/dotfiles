// Project picker, like `dev tmux open`: every ~/workspace/<owner>/<repo> on
// this computer and on each connected machine, fuzzy filtered, with its
// README beside it. Enter goes to the project's space on that machine if one
// is open there, else starts a new space in it through new-space. Esc closes.
// This computer's projects show at once from the last open's list (shared
// "projects.local") and are refreshed from disk; other machines' arrive as
// their `exec` answers.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, TextView, Scrollbar, v_virtual_list, VirtualListScrollHandle } from "gpui-base";
import { exec, machines, readTextFile, spaces, run, theme, props, openOverlay, closeOverlay, shared, setShared } from "herdr";

const ROW = 28;

// fzf-style subsequence match: null if no match, else a score (higher is better).
function score(text, query) {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase().replace(/\s+/g, "");
  let at = 0, s = 0, run = 0;
  for (const ch of q) {
    const i = t.indexOf(ch, at);
    if (i < 0) return null;
    run = i === at ? run + 1 : 0;
    const boundary = i === 0 || "/-_. ".includes(t[i - 1]);
    s += 1 + run * 2 + (boundary ? 3 : 0) - Math.min(i - at, 5) * 0.2;
    at = i + 1;
  }
  return s - t.length * 0.01;
}

// The projects in a machine's ~/workspace (null: this computer), as rows.
async function listProjects(machine) {
  const r = await exec("sh", ["-c", 'cd && root="$PWD/workspace" && printf "%s\\n" "$root" && for d in "$root"/*/*; do [ -d "$d" ] && printf "%s\\n" "${d#$root/}"; done'], { on: machine });
  const [root, ...projects] = r.stdout.split("\n").filter(Boolean);
  return projects.map((project) => ({ machine, root, project }));
}

const key = (r) => `${r.machine ?? ""}:${r.project}`;
const label = (r) => (r.machine ? `${r.machine} ${r.project}` : r.project);

export default class Projects extends View {
  init(_props, cx) {
    this.list = shared("projects.local") ?? [];
    this.at = 0;
    this.readme = {};
    this.scroll = VirtualListScrollHandle.new();
    this.input = InputState.new({ placeholder: "Open a project…" });
    this.input.on("change", (_e, cx) => { this.at = 0; this.scroll.scroll_to_item(0); this.loadReadme(cx); cx.notify(); });
    this.input.on("submit", () => this.go(this.rows()[this.at]));
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.handle = cx.focus_handle();
    this.load(cx, null);
    for (const m of machines()) if (m.name && m.layout !== "unavailable") this.load(cx, m.name);
    this.loadReadme(cx);
  }

  load(cx, machine) {
    cx.spawn(async (cx) => {
      let rows;
      try { rows = await listProjects(machine); } catch { return; }
      if (!machine && JSON.stringify(rows) !== JSON.stringify(shared("projects.local") ?? [])) setShared("projects.local", rows);
      this.list = [...this.list.filter((r) => r.machine !== machine), ...rows].sort((a, b) =>
        (a.machine === null ? "" : a.machine).localeCompare(b.machine === null ? "" : b.machine));
      this.loadReadme(cx);
      cx.notify();
    });
  }

  close() {
    closeOverlay(props().overlay);
  }

  // The space already working in a project: on its machine, its folder is the project or inside it.
  spaceFor(row, all = spaces()) {
    const dir = `${row.root}/${row.project}`;
    return all.find((s) => (s.machine ?? null) === row.machine && s.folder && (s.folder === dir || s.folder.startsWith(dir + "/")));
  }

  rows() {
    const q = this.input.value();
    if (!q) return this.list;
    return this.list
      .map((r) => ({ r, s: score(label(r), q) }))
      .filter((x) => x.s !== null)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.r);
  }

  // What the list shows: the rows, under a heading per machine when unfiltered.
  items(rows) {
    if (this.input.value()) return rows.map((row, i) => ({ row, i }));
    return rows.flatMap((row, i) =>
      i === 0 || rows[i - 1].machine !== row.machine ? [{ heading: row.machine }, { row, i }] : [{ row, i }]);
  }

  loadReadme(cx) {
    const r = this.rows()[this.at];
    if (!r || key(r) in this.readme) return;
    this.readme[key(r)] = null;
    cx.spawn(async (cx) => {
      let text = null;
      try { text = await readTextFile(`${r.root}/${r.project}/README.md`, { on: r.machine }); } catch {}
      this.readme[key(r)] = text ?? "";
      cx.notify();
    });
  }

  go(row) {
    if (!row) return;
    this.close();
    const open = this.spaceFor(row);
    if (open) run("space.select", { id: open.id });
    else openOverlay({
      mod: "new-space",
      props: { folder: `${row.root}/${row.project}`, ...(row.machine ? { machine: row.machine } : {}) },
      kind: "popup", width: 1, height: 1, frame: "none",
    });
  }

  render() {
    const t = theme();
    const all = spaces();
    const rows = this.rows();
    this.at = Math.max(0, Math.min(this.at, rows.length - 1));
    const sel = rows[this.at];
    const readme = sel ? this.readme[key(sel)] : undefined;
    const items = this.items(rows);

    const row = (r, i) => {
      const [owner, repo] = r.project.split("/");
      const on = i === this.at;
      const open = this.spaceFor(r, all);
      return h_flex()
        .id(`pj-${key(r)}`)
        .px(10)
        .h(ROW)
        .rounded(6)
        .gap(6)
        .items_center()
        .cursor_pointer()
        .when(on, (el) => el.bg(t.selected))
        .hover((s) => s.bg(t.hover))
        .child(div().text_color(t.dim).child(`${owner}/`))
        .child(div().flex_1().truncate().text_color(t.foreground).when(on, (d) => d.font_semibold()).child(repo))
        .when(!!open, (el) => el.child(div().text_size(11).text_color(t.accent).child("open")))
        .when(!!r.machine, (el) => el.child(div().text_size(11).text_color(t.dim).child(r.machine)));
    };

    const heading = (machine) => h_flex()
      .id(`pj-machine-${machine ?? "local"}`)
      .px(10).h(ROW).items_end().pb(4)
      .text_size(11).text_color(t.dim)
      .child(machine ?? "This computer");

    const itemKey = (n) => (items[n].heading !== undefined ? `heading:${items[n].heading ?? ""}` : key(items[n].row));
    const list = v_flex().relative().w(320).flex_none().h_full()
      .child(
        v_virtual_list("pj-list", items.length, ROW, itemKey, (range) =>
          items.slice(range.start, range.end).map((it) => (it.row ? row(it.row, it.i) : heading(it.heading))))
          .track_scroll(this.scroll)
          .size_full()
          .on_item_click((k) => this.go(rows.find((r) => key(r) === k))),
      )
      .child(Scrollbar.vertical("pj-list").absolute().inset_0());

    const where = sel ? (sel.machine ? `${sel.machine}:${sel.project}` : sel.project) : "";
    const preview = v_flex()
      .flex_1()
      .min_w(0)
      .h_full()
      .p(14)
      .rounded(8)
      .bg(t.background)
      .border_1()
      .border_color(t.border)
      .overflow_y_scrollbar()
      .text_size(12.5)
      .child(
        !sel ? div().text_color(t.dim).child(this.list.length ? "No match" : "…")
        : readme === undefined || readme === null ? div().text_color(t.dim).child("…")
        : readme === "" ? div().text_color(t.dim).child(`No README.md in ${where}`)
        : TextView.markdown(`readme-${key(sel)}`, readme),
      );

    return v_flex()
      .id("projects")
      .track_focus(this.handle)
      .size_full()
      .p(16)
      .gap(10)
      .bg(t.popover)
      .text_size(13)
      .on_key_down((e, cx) => {
        const k = e.key;
        const n = rows.length || 1;
        const ctrl = e.modifiers.control;
        if (k === "escape") return this.close();
        if (k === "down" || (ctrl && k === "n")) this.at = (this.at + 1) % n;
        else if (k === "up" || (ctrl && k === "p")) this.at = (this.at + n - 1) % n;
        else return;
        const shown = items.findIndex((it) => it.row && it.i === this.at);
        if (shown >= 0) this.scroll.scroll_to_item(this.at === 0 ? 0 : shown, "center");
        this.loadReadme(cx);
        cx.stop_propagation();
        cx.notify();
      })
      .child(
        h_flex().items_center()
          .child(div().flex_1().text_size(15).font_semibold().text_color(t.foreground).child("Open project"))
          .child(div().text_size(11).text_color(t.dim).child(`${rows.length}/${this.list.length}  ·  Esc`)),
      )
      .child(
        h_flex().h(36).flex_none().px(10).gap(8).items_center().rounded(9).border_1().border_color(t.accent).bg(t.background)
          .child(svg("mods/workspace-chrome/search.svg").size(15).text_color(t.dim))
          .child(Input.new(this.input).flex_1().h_full().text_size(12.8).text_color(t.foreground)),
      )
      .child(
        h_flex().h(4000).flex_shrink_1().min_h(0).gap(12)
          .child(list)
          .child(preview),
      );
  }
}
