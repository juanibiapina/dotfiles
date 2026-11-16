// The notes space on mini, like desktop's notes mod (ctrl-space o) made for the
// phone: its pi sessions, most urgent first, sub-agents under their parent.
// The round + starts pi there, and opens the space in ~/Sync/notes first when
// it isn't open. The view never opens the space by itself: desktop's
// tabs-juan closes a space when its last pi ends, and reopening it then would
// start pi again.
//
// Sets shared "notes.needs" (blocked or finished sessions) for the tab's badge.

import { View, div, h_flex, v_flex, svg, icon } from "herdr-ui";
import { spaces, agents, machines, theme, safeArea, layout, run, exec, openOverlay, notify, shared, setShared } from "herdr";

const MACHINE = "mini";
const NAME = "notes";
const FOLDER = "Sync/notes"; // under the home on MACHINE

const RANK = { blocked: 0, done: 1, idle: 1, working: 2 };
const changed = (a) => a.statusAt ?? a.createdAt;
const byUrgency = (a, b) => (RANK[a.status] ?? 3) - (RANK[b.status] ?? 3) || changed(b) - changed(a);

// Parents first, each followed by the agents it started.
function family(list) {
  const here = new Set(list.map((a) => a.address));
  const kids = new Map();
  for (const a of list) if (a.parent && here.has(a.parent)) kids.set(a.parent, [...(kids.get(a.parent) ?? []), a]);
  const out = [];
  const walk = (a, depth) => {
    out.push({ a, sub: depth > 0 });
    for (const k of kids.get(a.address) ?? []) walk(k, depth + 1);
  };
  for (const a of list) if (!a.parent || !here.has(a.parent)) walk(a, 0);
  return out;
}

// "π - groceries - notes" reads as "groceries".
function title(a) {
  const raw = a.title || a.name || a.program.name || a.address;
  const trimmed = raw.replace(/^\S{1,2}\s+-\s+/, "").replace(new RegExp(` - ${NAME}$`), "");
  return trimmed || raw;
}

function ago(ms) {
  if (!ms) return "";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function dot(t, a) {
  if (a.status === "working") return svg("icons/ui/spinner.svg").size(18).text_color(t.working).spin(900);
  if (a.status === "blocked") return div().size(10).rounded_full().bg(t.blocked);
  if (a.status === "done") return div().size(10).rounded_full().border(2).border_color(t.done);
  return div().size(10).rounded_full().border(2).border_color(t.border);
}

export default class Notes extends View {
  init(_props, cx) {
    this.folder = null;
    this.starting = false;
    cx.timer.every(15000, (cx) => cx.notify());
  }

  space() {
    const mine = spaces().filter((s) => s.machine === MACHINE);
    return mine.find((s) => s.named && s.name === NAME) ?? (this.folder ? mine.find((s) => s.folder === this.folder) : undefined);
  }

  start(cx) {
    if (this.starting) return;
    this.starting = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const open = this.space();
        let terminal;
        if (open) {
          terminal = (await run("tab.new", { space: open.id, argv: ["pi"] })).terminal;
        } else {
          const r = await exec("sh", ["-c", 'cd "$HOME/$1" && pwd', "sh", FOLDER], { on: MACHINE });
          if (r.code !== 0) throw new Error(r.stderr.trim() || `no ~/${FOLDER} on ${MACHINE}`);
          this.folder = r.stdout.trim();
          terminal = (await run("space.new", { machine: MACHINE, name: NAME, folder: this.folder, argv: ["pi"] })).terminal;
        }
        await run("terminal.show", { terminal });
      } catch (e) {
        notify({ title: "Could not start pi", body: e.message, level: "error" });
      }
      this.starting = false;
      cx.notify();
    });
  }

  row(t, { a, sub }) {
    const msg = a.message && !title(a).includes(a.message) ? a.message : null;
    return h_flex().id(`a-${a.address}`).gap(12).pl(sub ? 36 : 12).pr(12).py(14).items_center().rounded(10)
      .on_click(() => run("terminal.show", { terminal: a.address }))
      .on_long_press(() => openOverlay({ mod: "classic", kind: "sheet", props: { actions: a.address } }))
      .swipe("right", { label: "Close", color: t.blocked, action: () => run("terminal.close", { terminal: a.address }) })
      .child(h_flex().w(20).justify_center().child(dot(t, a)))
      .child(v_flex().flex_1().min_w(0)
        .child(div().truncate().text_size(16).text_color(t.foreground).child(title(a)))
        .when(Boolean(msg), (el) => el.child(div().line_clamp(2).mt(2).text_size(13).text_color(a.status === "blocked" ? t.blocked : t.muted).child(msg))))
      .child(div().text_size(12).font_mono().text_color(t.muted).child(ago(changed(a))));
  }

  render(cx) {
    const t = theme();
    const space = this.space();
    const list = space ? family(agents().filter((a) => a.space === space.id).sort(byUrgency)) : [];

    const needs = list.filter(({ a }) => a.status === "blocked" || a.status === "done").length;
    if (shared("notes.needs") !== needs) setShared("notes.needs", needs);

    const m = machines().find((x) => x.name === MACHINE);
    const up = m?.state === "connected";
    // Under bottom tabs, the tab bar already keeps clear of the phone's edge.
    const bottom = layout()?.root?.type === "tabs" ? 0 : safeArea().bottom;

    const banner = up ? null : h_flex().id("down").gap(8).items_center().bg(t.surface).rounded(10).p(12).mb(10)
      .on_click(() => run("app.machines"))
      .child(div().size(8).rounded_full().bg(m?.state === "connecting" ? t.working : t.blocked))
      .child(div().flex_1().line_clamp(2).text_size(14).text_color(t.foreground)
        .child(!m ? `Add ${MACHINE} in Machines to see your notes sessions.` : m.state === "connecting" ? `${MACHINE}: connecting…` : `${MACHINE}: ${m.error || "offline"}`));

    const empty = v_flex().items_center().mt(60).gap(10).px(24)
      .child(div().text_size(20).font_bold().text_color(t.foreground).child("No sessions"))
      .child(div().text_size(14).text_center().text_color(t.muted)
        .child(space ? "Tap + to start pi in your notes." : `Tap + to open ~/${FOLDER} on ${MACHINE} and start pi.`));

    return v_flex().size_full().bg(t.background)
      .child(v_flex().flex_1().overflow_y_scroll().p(12).pb(bottom + 96)
        .child(banner)
        .when(up && !list.length, (el) => el.child(empty))
        .children(list.map((x) => this.row(t, x))))
      .when(up, (el) => el.child(h_flex().id("new").absolute().right(20).bottom(bottom + 20).size(56).rounded_full().bg(t.accent).items_center().justify_center()
        .on_click((_e, cx) => this.start(cx))
        .child(this.starting
          ? svg("icons/ui/spinner.svg").size(26).text_color(t.accent_foreground).spin(900)
          : icon("add").size(32).text_color(t.accent_foreground))));
  }
}
