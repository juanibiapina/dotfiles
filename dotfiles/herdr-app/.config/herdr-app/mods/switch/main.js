// Space switcher, like `dev tmux switch`: open spaces, most recently used
// first (spaces that need you on top, this one last), fuzzy filtered, with
// the space's tabs and a snapshot of its terminal beside it.
// Enter goes there, ctrl-x closes the space, Esc leaves.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { spaces, panes, hc, home, run, theme, settings, props, closeOverlay, shared, setShared } from "herdr";

const MARK = { ansi6: "#22a99a", ansi3: "#e3814f", ansi4: "#5b8def", ansi5: "#8b7cf6", ansi2: "#3fae6a", ansi1: "#d9649a" };
const URGENCY = { blocked: 0, done: 1 };

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

const tilde = (p) => (p && p.startsWith(home()) ? "~" + p.slice(home().length) : p || "~");

export default class Switch extends View {
  init(_props, cx) {
    this.at = 0;
    this.screens = {};
    // Most recently used spaces, kept across opens. The one we open from goes first.
    const here = spaces().find((s) => s.active);
    const ids = new Set(spaces().map((s) => s.id));
    this.mru = [here?.id, ...((shared("switch.mru") ?? []).filter((id) => id !== here?.id))].filter((id) => id && ids.has(id));
    setShared("switch.mru", this.mru);
    this.input = InputState.new({ placeholder: "Switch to a space…" });
    this.input.on("change", (_e, cx) => { this.at = 0; this.loadScreen(cx); cx.notify(); });
    this.input.on("submit", () => this.go(this.rows()[this.at]));
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.handle = cx.focus_handle();
    this.loadScreen(cx);
    // The snapshot follows the terminal while the switcher is open.
    cx.timer.every(1500, (cx) => { this.loadScreen(cx, true); });
  }

  close() {
    closeOverlay(props().overlay);
  }

  rows() {
    const all = spaces();
    const rank = (s) => {
      if (s.active) return [3, 0];
      if (s.status in URGENCY) return [0, URGENCY[s.status]];
      const i = this.mru.indexOf(s.id);
      return i >= 0 ? [1, i] : [2, s.index];
    };
    const q = this.input.value();
    return all
      .map((s) => ({ s, r: rank(s), m: score(`${s.name} ${s.branch ?? ""} ${tilde(s.folder)}`, q) }))
      .filter((x) => x.m !== null)
      .sort((a, b) => (q ? b.m - a.m : 0) || a.r[0] - b.r[0] || a.r[1] - b.r[1])
      .map((x) => x.s);
  }

  // The terminal to preview: the active tab's agent, else its first terminal.
  paneFor(space) {
    const tab = space.tabs.find((t) => t.active) ?? space.tabs[0];
    const mine = panes().filter((p) => p.tab === tab?.id && p.terminal);
    return mine.find((p) => p.focused) ?? mine.find((p) => p.status) ?? mine[0];
  }

  loadScreen(cx, refresh = false) {
    const s = this.rows()[this.at];
    const p = s && this.paneFor(s);
    if (!p) return;
    if (!refresh && p.terminal in this.screens) return;
    if (!(p.terminal in this.screens)) this.screens[p.terminal] = null;
    cx.spawn(async (cx) => {
      const r = await hc(["read", p.terminal]);
      // Trim the screen and fold runs of blank lines into one, so the snapshot shows content.
      const lines = r.code === 0
        ? r.stdout.replace(/\s+$/, "").replace(/^\s*\n/, "").split("\n").map((l) => l.trimEnd())
            .filter((l, i, a) => l || (i > 0 && a[i - 1]))
        : [];
      this.screens[p.terminal] = lines;
      cx.notify();
    });
  }

  go(s) {
    if (!s) return;
    this.close();
    setShared("switch.mru", [s.id, ...this.mru.filter((id) => id !== s.id)]);
    run("space.select", { id: s.id });
  }

  spaceColor(t, s) {
    if (s.name === "~") return t.dim;
    const c = (shared("space.colors") ?? {})[s.id];
    if (!c) return t.accent;
    return c.startsWith("#") ? c : (MARK[c] ?? t[c]);
  }

  glyph(t, st, size = 12) {
    if (st === "working") return svg("mods/workspace-chrome/spinner.svg").size(size).flex_none().text_color(t.working).spin(900);
    return div().w(size).flex_none().text_color(t[st] ?? t.dim).child(st === "idle" ? "○" : st ? "●" : "");
  }

  tile(t, s, size = 20) {
    return h_flex().size(size).flex_none().rounded(5).bg(this.spaceColor(t, s)).items_center().justify_center()
      .text_size(size * 0.55).font_bold().text_color("#ffffff").child(s.name[0]?.toUpperCase() ?? "?");
  }

  render() {
    const t = theme();
    const rows = this.rows();
    this.at = Math.max(0, Math.min(this.at, rows.length - 1));
    const sel = rows[this.at];

    const row = (s, i) => {
      const on = i === this.at;
      return h_flex()
        .id(`sw-${s.id}`)
        .px(8)
        .h(36)
        .flex_none()
        .rounded(7)
        .gap(10)
        .items_center()
        .cursor_pointer()
        .when(on, (el) => el.bg(t.selected))
        .hover((el) => el.bg(t.hover))
        .on_click(() => this.go(s))
        .child(this.tile(t, s))
        .child(
          v_flex().flex_1().min_w(0)
            .child(div().truncate().text_color(s.active ? t.muted : t.foreground).when(on, (d) => d.font_semibold()).child(s.name))
            .when(!!s.branch, (el) => el.child(div().truncate().text_size(11).text_color(t.dim).child(s.branch))),
        )
        .when(s.status === "blocked", (el) => el.child(div().text_size(11).text_color(t.blocked).child("needs you")))
        .when(s.status === "done", (el) => el.child(div().text_size(11).text_color(t.done).child("finished")))
        .when(s.active, (el) => el.child(div().text_size(11).text_color(t.dim).child("here")))
        .when(!!s.machine, (el) => el.child(div().text_size(11).text_color(t.dim).child(s.machine)))
        .child(this.glyph(t, s.status));
    };

    const preview = () => {
      if (!sel) return v_flex().flex_1().items_center().justify_center().text_color(t.dim).child("No match");
      const p = this.paneFor(sel);
      const screen = p ? this.screens[p.terminal] : undefined;
      const tabs = sel.tabs.map((tb) => {
        const progs = panes().filter((x) => x.tab === tb.id).map((x) => x.program?.name ?? x.title).filter(Boolean);
        return h_flex().gap(8).items_center().h(22)
          .child(this.glyph(t, tb.status, 10))
          .child(div().text_color(tb.active ? t.foreground : t.muted).when(tb.active, (d) => d.font_semibold()).child(tb.name))
          .child(div().flex_1().truncate().text_size(11).text_color(t.dim).child(progs.join(" · ")));
      });
      return v_flex().flex_1().min_w(0).h_full().gap(10)
        .child(
          h_flex().gap(10).items_center().flex_none()
            .child(this.tile(t, sel, 28))
            .child(
              v_flex().flex_1().min_w(0)
                .child(div().text_size(15).font_semibold().text_color(t.foreground).truncate().child(sel.name))
                .child(div().text_size(11).text_color(t.dim).truncate().child([tilde(sel.folder), sel.branch].filter(Boolean).join("  ·  "))),
            ),
        )
        .child(v_flex().flex_none().children(tabs))
        .child(
          v_flex().id("sw-screen").flex_1().min_h(0).p(12).rounded(8).bg(t.background).border_1().border_color(t.border)
            .overflow_hidden().justify_end()
            .font_family(settings().font_family ?? "JetBrains Mono").text_size(11).text_color(t.foreground)
            .children(
              !p ? [div().text_color(t.dim).child("No terminal")]
              : !screen ? [div().text_color(t.dim).child("…")]
              : screen.map((l, i) => div().id(`l${i}`).h(15).flex_none().whitespace_nowrap().overflow_hidden().child(l || " ")),
            ),
        );
    };

    return v_flex()
      .id("switch")
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
        else if (ctrl && k === "x") {
          if (sel) { this.close(); run("space.close", { id: sel.id }); }
          return cx.stop_propagation();
        } else return;
        this.loadScreen(cx);
        cx.stop_propagation();
        cx.notify();
      })
      .child(
        h_flex().items_center()
          .child(div().flex_1().text_size(15).font_semibold().text_color(t.foreground).child("Switch space"))
          .child(div().text_size(11).text_color(t.dim).child(`↵ go  ·  ⌃x close  ·  Esc`)),
      )
      .child(
        h_flex().h(36).flex_none().px(10).gap(8).items_center().rounded(9).border_1().border_color(t.accent).bg(t.background)
          .child(svg("mods/workspace-chrome/search.svg").size(15).text_color(t.dim))
          .child(Input.new(this.input).flex_1().h_full().text_size(12.8).text_color(t.foreground)),
      )
      .child(
        h_flex().flex_1().min_h(0).gap(14)
          .child(v_flex().id("sw-list").w(300).flex_none().h_full().gap(2).overflow_y_scrollbar().children(rows.map(row)))
          .child(preview()),
      );
  }
}
