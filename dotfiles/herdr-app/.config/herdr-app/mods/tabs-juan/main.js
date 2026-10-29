import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, agents, run, openOverlay, theme, window, shared, setShared, layout, nextCommand } from "herdr";

// Agents marked with "tabs-juan.close-when-done", by terminal address.
const CLOSE_WHEN_DONE = "juan.close-when-done";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export default class Tabs extends View {
  init(_props, cx) {
    this.pressed = null;
    this.panels = JSON.parse(localStorage.getItem("panels") ?? "{}");
    // Each space's tabs, most recently shown first, for "tabs-juan.last" and
    // for going back to the previous tab when the shown one closes.
    this.recent = {};
    // The two most recent spaces, newest first, for "tabs-juan.last-space".
    this.recentSpaces = [];
    // Each agent's last seen status, to catch the moment a marked one stops working.
    this.statuses = {};
    cx.spawn(async () => {
      for (;;) {
        const command = await nextCommand();
        if (command === "last") this.selectLast();
        else if (command === "attention") this.showAttention();
        else if (command === "last-space") this.selectLastSpace();
        else if (command === "close-when-done") this.toggleCloseWhenDone();
        else if (command === "close-space") this.closeSpace();
        else if (command === "new-tab") this.newTabAtEnd();
      }
    });
  }

  // tab.new puts the tab beside the shown one; move it after the last tab instead.
  newTabAtEnd() {
    const space = spaces().find(p => p.active);
    if (!space) return run("tab.new");
    this.newTab = { space: space.id, before: new Set(space.tabs.map(c => c.id)) };
    run("tab.new", { space: space.id });
    this.moveNewTab(spaces().find(p => p.id === space.id));
  }

  moveNewTab(space) {
    if (!this.newTab || space?.id !== this.newTab.space) return;
    const tab = space.tabs.find(c => !this.newTab.before.has(c.id));
    if (!tab) return;
    this.newTab = null;
    if (tab.index !== space.tabs.length) run("tab.move", { id: tab.id, index: space.tabs.length });
  }

  noteActive(space) {
    if (!space) return;
    this.moveNewTab(space);
    const ids = new Set(space.tabs.map(c => c.id));
    const active = space.tabs.find(c => c.active)?.id;
    const was = this.recent[space.id] ?? [];
    const left = was.filter(id => ids.has(id));
    const sameSpace = this.lastSpace === space.id;
    this.lastSpace = space.id;
    // Until our select lands, Herdr's own pick isn't a visit.
    if (this.closing) {
      if (active !== this.closing.id && Date.now() < this.closing.until) return;
      this.closing = null;
    }
    // The shown tab closed: Herdr picked a neighbour, go to the most recent one instead.
    if (sameSpace && was[0] && !ids.has(was[0]) && left[0] && left[0] !== active) {
      this.recent[space.id] = left;
      this.closing = { id: left[0], until: Date.now() + 1000 };
      run("tab.select", { id: left[0] });
      return;
    }
    this.recent[space.id] = active ? [active, ...left.filter(id => id !== active)] : left;
  }

  selectLast() {
    const space = spaces().find(p => p.active);
    const prev = this.recent[space?.id]?.find(id => id !== space.tabs.find(c => c.active)?.id && space.tabs.some(c => c.id === id));
    if (prev) run("tab.select", { id: prev });
  }

  noteActiveSpace(space) {
    const r = this.recentSpaces;
    if (space && r[0] !== space.id) this.recentSpaces = r[0] ? [space.id, r[0]] : [space.id];
  }

  selectLastSpace() {
    const prev = this.recentSpaces[1];
    if (prev && spaces().some(p => p.id === prev)) run("space.select", { id: prev });
  }

  // Close the shown space without asking, like tmux kill-session, and go to the
  // previous space as tmux does with detach-on-destroy off.
  closeSpace() {
    const space = spaces().find(p => p.active);
    if (!space) return;
    this.selectLastSpace();
    run("space.close", { id: space.id, confirmed: true });
  }

  // An agent waiting on the person: blocked before done, the longest waiting first.
  showAttention() {
    const rank = { blocked: 0, done: 1 };
    const next = agents().filter(a => a.status in rank && !a.focused)
      .sort((a, b) => rank[a.status] - rank[b.status] || a.seq - b.seq)[0];
    if (next) run("agent.focus", { terminal: next.address });
  }

  toggleCloseWhenDone() {
    const agent = agents().find(a => a.focused);
    if (!agent) return;
    const marked = shared(CLOSE_WHEN_DONE) ?? [];
    const on = !marked.includes(agent.address);
    setShared(CLOSE_WHEN_DONE, on ? [...marked, agent.address] : marked.filter(a => a !== agent.address));
  }

  // A marked agent that goes from working to done or idle has finished its
  // turn: kill its terminal, which closes its pane (and its tab if alone).
  closeFinished() {
    const marked = shared(CLOSE_WHEN_DONE) ?? [];
    const live = agents();
    for (const a of live) {
      const was = this.statuses[a.address];
      this.statuses[a.address] = a.status;
      if (was === "working" && (a.status === "done" || a.status === "idle") && marked.includes(a.address)) {
        run("terminal.kill", { terminal: a.address });
      }
    }
    // Forget agents seen before that are gone (not ones still loading).
    const kept = marked.filter(address => !(address in this.statuses) || live.some(a => a.address === address));
    if (kept.length !== marked.length) setShared(CLOSE_WHEN_DONE, kept);
  }

  // The side panel is remembered per space: switching shows that space's choice
  // (closed if it never had one), and opening or closing it records it.
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id; this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null, want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
          else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    // Until the restore lands (or something else won), the old state isn't a choice.
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  render() {
    const t = theme();
    const space = spaces().find(p => p.active);
    const shown = space?.tabs ?? [];
    this.noteActive(space);
    this.noteActiveSpace(space);
    this.closeFinished();
    const marked = shared(CLOSE_WHEN_DONE) ?? [];
    const stop = (_e, cx) => cx.stop_propagation();
    const button = (id, label, action) => div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(6).text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", stop).on_click(action).child(label);
    const item = (c, i) => {
      const program = panes().find(p => p.tab === c.id && p.program?.agent)?.program ?? panes().find(p => p.tab === c.id)?.program;
      const name = /^tb\d+$/.test(c.name) ? program?.name ?? "Terminal" : c.name;
      return h_flex().id(`tab-${c.id}`).h(29).px(10).gap(7).rounded(7).items_center().flex_none().text_size(12.8)
        .border(1).border_color(c.active ? t.border : t.chrome).bg(c.active ? t.raised : t.chrome).text_color(c.active ? t.foreground : t.muted)
        .hover(s => s.bg(t.hover))
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = i; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
        .on_mouse_up("left", () => {
          const from = this.pressed; this.pressed = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: space.tabs.findIndex(x => x.id === c.id) + 1 });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }))
        .child(div().flex_none().text_color(c.active ? t.accent : t.dim).child(String(i + 1)))
        .when(Boolean(program?.icon), el => el.child(program.tint ? svg(program.icon).size(14).text_color(t.muted) : image(program.icon).size(14)))
        .when(!program?.icon, el => el.child(div().max_w(170).truncate().child(name)))
        .when(c.zoomed, el => el.child("Z"))
        .when(agents().some(a => a.tab === c.id && marked.includes(a.address)), el => el.child(svg("mods/workspace-chrome/circle-check.svg").size(12).flex_none().text_color(t.accent)))
        .when(c.status === "working", el => el.child(svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
        .when(c.status === "blocked" || c.status === "done", el => el.child(div().size(6).rounded(3).bg(t[c.status])))
        .when(c.active, el => el.child(div().id(`close-${c.id}`).text_color(t.dim).on_mouse_down("left", stop).on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: c.id }); }).child(svg("mods/pane/close.svg").size(12))));
    };
    const panel = find(layout(), "panel"), body = find(layout(), "panel-body");
    // Only panels this layout has: Juan's layout drops Changes.
    const enabled = (shared("workspace.panels") ?? ["files"]).filter(id => body?.children?.some(c => c.id === id));
    this.syncPanel(space, panel, body, enabled);
    const panelButton = (id, label, icon) => {
      const on = panel && !panel.hidden && body?.active === id;
      return h_flex().id(`panel-${id}`).h(26).px(8).gap(5).flex_none().items_center().rounded(6)
        .text_size(12).bg(on ? t.selected : t.chrome).text_color(on ? t.foreground : t.muted)
        .hover(s => s.bg(t.hover)).on_mouse_down("left", stop)
        .on_click(() => {
          if (on) run("layout.hide", { id: "panel" });
          else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
        }).child(svg(icon).size(14)).child(label);
    };
    return h_flex().size_full().min_w(0).px(10).gap(3).items_center().bg(t.chrome).border_t(1).border_color(t.border)
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel(e => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_center().gap(3).overflow_x_scrollbar().children(shown.map(item)))
      .when(enabled.includes("files"), el => el.child(panelButton("files", "Files", "mods/files/file.svg")))
      .when(window()?.buttons, el => el.child(button("minimize", "−", () => run("window.minimize")))
        .child(button("maximize", "□", () => run("window.maximize")))
        .child(button("close-window", svg("mods/pane/close.svg").size(13), () => run("window.close"))));
  }
}
