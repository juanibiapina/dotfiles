// Juan's Spaces, as the app looked before the definition: every space with its
// agents (most urgent first, sub-agents under their parent), factory spaces
// last, and a round + that opens a project from ~/workspace.
// One mod, many faces, chosen by props:
//   {}                 the Spaces screen
//   { header: true }   the header's settings button
//   { projects: true } the project picker
//   { start: space }   a space's new-agent sheet
//   { actions: addr }  an agent's actions

import { View, div, h_flex, v_flex, svg, icon, input } from "herdr-ui";
import { spaces, agents, machines, theme, safeArea, run, exec, knownAgents, openOverlay, closeOverlay, notify, props } from "herdr";

// Where projects are found: <path>/<owner>/<repo> on every machine.
const PROJECT_PATHS = ["~/workspace"];
// A new project space: these tabs, in this order; the agent opens.
const SPACE_TABS = [["nvim-server"], ["deltoids"], ["gob", "tui"]];
const AGENTS = [{ cmd: "pi", label: "Pi" }, { cmd: "claude", label: "Claude" }];

// ---- Agents ----

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

// "π - fix login - app" reads as "fix login".
function title(a) {
  const raw = a.title || a.name || a.program.name || a.argv[0]?.split("/").pop() || a.address;
  const base = a.cwd.replace(/\/+$/, "").split("/").pop();
  const trimmed = raw.replace(/^\S{1,2}\s+-\s+/, "").replace(new RegExp(` - ${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");
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

const shortPath = (p) => p.replace(/^\/(home|Users)\/[^/]+/, "~");

// Spaces A–Z, factory ones last, each with its agents; agents in no space apart.
function grouped() {
  const all = agents();
  const list = [...spaces()]
    .map((s) => ({ ...s, factory: s.id.startsWith("factory-"), agents: family(all.filter((a) => a.space === s.id).sort(byUrgency)) }))
    .sort((a, b) => Number(a.factory) - Number(b.factory) || a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }));
  const loose = family(all.filter((a) => !a.space).sort(byUrgency));
  return { list, loose };
}

// ---- Pieces ----

function dot(t, a, size = 10) {
  if (!a.status) return div().size(size).rounded_full().border(2).border_color(t.border);
  if (a.status === "working") return svg("icons/ui/spinner.svg").size(18).text_color(t.working).spin(900);
  if (a.status === "blocked") return div().size(size).rounded_full().bg(t.blocked);
  return div().size(size).rounded_full().border(2).border_color(t.done);
}

function agentRow(t, { a, sub }, opts = {}) {
  const msg = a.message && !title(a).includes(a.message) ? a.message : null;
  return h_flex().id(`a-${a.address}`).gap(12).pl(sub ? 32 : 8).pr(8).py(12).items_center().rounded(10)
    .on_click(() => {
      opts.before?.();
      run("terminal.show", { terminal: a.address });
    })
    .on_long_press(() => openOverlay({ mod: "classic", kind: "sheet", props: { actions: a.address } }))
    .when(opts.swipe !== false, (el) => el.swipe("right", { label: "Close", color: t.blocked, action: () => confirmClose(a) }))
    .child(h_flex().w(20).justify_center().child(dot(t, a)))
    .child(v_flex().flex_1().min_w(0)
      .child(div().truncate().text_size(15).text_color(t.foreground).child(title(a)))
      .when(Boolean(msg), (el) => el.child(div().truncate().mt(2).text_size(13).text_color(a.status === "blocked" ? t.blocked : t.muted).child(msg)))
      .when(Boolean(opts.place), (el) => el.child(div().truncate().mt(2).text_size(12).font_mono().text_color(t.muted).child(opts.place))))
    .child(div().text_size(12).font_mono().text_color(t.muted).child(ago(changed(a))));
}

function confirmClose(a) {
  openOverlay({
    mod: "confirm",
    kind: "dialog",
    props: { title: `Close ${title(a)}?`, detail: "Its program ends and the session goes away. This cannot be undone.", command: { name: "terminal.close", args: { terminal: a.address } } },
  });
}

function spaceList(t, list, loose, showMachine, opts = {}) {
  const sections = list.map((s) => v_flex().id(`s-${s.id}`).mb(16)
    .child(h_flex().gap(8).px(8).min_h(36).items_center()
      .child(div().flex_shrink().truncate().text_size(15).font_bold().font_mono().text_color(t.foreground).child(s.name))
      .when(s.factory, (el) => el.child(div().rounded(6).bg(t.accent + "26").px(6).py(1).child(div().text_size(10).font_bold().text_color(t.accent).child("factory"))))
      .when(showMachine, (el) => el.child(div().text_size(12).text_color(t.muted).child(s.machine)))
      .child(div().flex_1())
      .when(opts.start !== false, (el) => el.child(h_flex().id(`new-${s.id}`).size(32).rounded_full().bg(t.surface).items_center().justify_center()
        .on_click(() => openOverlay({ mod: "classic", kind: "sheet", props: { start: s.id } }))
        .child(icon("add").size(20).text_color(t.foreground)))))
    .children(s.agents.map((x) => agentRow(t, x, opts))));
  if (loose.length) {
    sections.push(v_flex().id("loose").mb(16)
      .child(h_flex().px(8).min_h(36).items_center().child(div().text_size(15).font_bold().font_mono().text_color(t.muted).child("Not in a space")))
      .children(loose.map((x) => agentRow(t, x, opts))));
  }
  return sections;
}

const roundButton = (id, size, bg, border, child, action) =>
  h_flex().id(id).size(size).rounded_full().bg(bg).when(Boolean(border), (el) => el.border(1).border_color(border)).items_center().justify_center().on_click(action).child(child);

// ---- The mod ----

export default class Classic extends View {
  init(_props, cx) {
    const p = props();
    if (p.projects) {
      this.query = "";
      this.projects = null;
      this.errors = [];
      this.loadProjects(cx);
    }
    if (p.start) {
      this.installed = null;
      const s = spaces().find((x) => x.id === p.start);
      if (s) cx.spawn(async (cx) => {
        try {
          this.installed = (await knownAgents({ on: s.machine })).filter((a) => a.installed).map((a) => a.run[0]);
        } catch {
          this.installed = [];
        }
        cx.notify();
      });
    }
    if (!Object.keys(p).filter((k) => k !== "overlay").length) cx.timer.every(15000, (cx) => cx.notify());
  }

  // ---- Spaces ----

  home(t) {
    const { list, loose } = grouped();
    const ms = machines();
    const down = ms.filter((m) => m.state !== "connected");
    const connected = ms.some((m) => m.state === "connected");
    const bottom = safeArea().bottom;
    const banner = down.length
      ? h_flex().id("down").gap(8).items_center().bg(t.surface).rounded(10).p(12).mb(10)
        .on_click(() => run("app.machines"))
        .child(div().size(8).rounded_full().bg(down.some((m) => m.state !== "connecting") ? t.blocked : t.working))
        .child(div().flex_1().line_clamp(2).text_size(14).text_color(t.foreground)
          .child(down.length > 1 ? `${down.length} machines are not connected` : `${down[0].name}: ${down[0].state === "connecting" ? "connecting…" : down[0].error || "offline"}`))
      : null;
    const empty = (head, text, button) => v_flex().items_center().mt(60).gap(10).px(24)
      .child(div().text_size(20).font_bold().text_color(t.foreground).child(head))
      .child(div().text_size(14).text_center().text_color(t.muted).child(text))
      .when(Boolean(button), (el) => el.child(button));
    return v_flex().size_full().bg(t.background)
      .child(v_flex().flex_1().overflow_y_scroll().p(12).pb(bottom + 96)
        .on_refresh(() => run("definition.reload"))
        .child(banner)
        .when(ms.length === 0, (el) => el.child(empty("No machines yet", "Add a machine that runs herdr-core to see its agents here.",
          div().id("add-machine").mt(8).px(16).py(10).rounded(10).bg(t.accent).on_click(() => run("app.machines")).child(div().text_size(15).font_semibold().text_color(t.accent_foreground).child("Add a machine")))))
        .children(spaceList(t, list, loose, ms.length > 1))
        .when(connected && !list.length && !loose.length, (el) => el.child(empty("No spaces yet", "Tap + to open a project."))))
      .when(connected, (el) => el.child(h_flex().absolute().right(20).bottom(bottom + 20).gap(8).items_center()
        .child(roundButton("open", 56, t.accent, null, icon("add").size(32).text_color(t.accent_foreground),
          () => openOverlay({ mod: "classic", kind: "sheet", props: { projects: true } })))));
  }

  // ---- Projects ----

  loadProjects(cx) {
    cx.spawn(async (cx) => {
      const found = [];
      const errors = [];
      for (const m of machines().filter((x) => x.state === "connected")) {
        for (const path of PROJECT_PATHS) {
          try {
            const r = await exec("sh", ["-c", PROBE, "herdr-projects", path, "grouped"], { on: m.name });
            if (r.code !== 0) throw new Error(r.stderr);
            const [root, ...rest] = r.stdout.split("\n").filter(Boolean);
            for (const p of rest) {
              const parts = p.split("/");
              const repo = parts.pop();
              found.push({ machine: m.name, owner: parts.join("/"), repo, folder: `${root.replace(/\/$/, "")}/${p}` });
            }
          } catch {
            errors.push(`${m.name}: could not read ${path}`);
          }
        }
      }
      this.projects = found;
      this.errors = errors;
      cx.notify();
    });
  }

  spaceFor(p) {
    return spaces().find((s) => s.machine === p.machine && !!s.folder && (s.folder === p.folder || s.folder.startsWith(p.folder + "/")));
  }

  pick(p, open, cx) {
    if (this.starting) return;
    this.starting = p.folder;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        let terminal;
        if (open) {
          terminal = (await run("tab.new", { space: open.id, argv: ["pi"] })).terminal;
        } else {
          const [first, ...rest] = SPACE_TABS;
          const made = await run("space.new", { machine: p.machine, folder: p.folder, argv: first });
          for (const argv of rest) await run("tab.new", { space: made.space, argv });
          terminal = (await run("tab.new", { space: made.space, argv: ["pi"] })).terminal;
        }
        closeOverlay(props().overlay);
        await run("terminal.show", { terminal });
      } catch (e) {
        notify({ title: "Could not start it", body: e.message, level: "error" });
        this.starting = null;
        cx.notify();
      }
    });
  }

  projectSheet(t) {
    const q = this.query.trim().toLowerCase();
    const shown = (this.projects ?? []).filter((p) => !q || `${p.owner ? `${p.owner}/` : ""}${p.repo}`.toLowerCase().includes(q));
    const many = new Set(shown.map((p) => p.machine)).size > 1;
    const rows = [];
    let last = "";
    for (const p of shown) {
      if (many && p.machine !== last) rows.push(div().mx(14).mt(12).mb(4).text_size(12).font_bold().text_color(t.muted).child(p.machine.toUpperCase()));
      last = p.machine;
      const open = this.spaceFor(p);
      rows.push(h_flex().id(`${p.machine}:${p.folder}`).gap(8).px(14).py(13).items_center().rounded(10)
        .when(Boolean(this.starting) && this.starting !== p.folder, (el) => el.opacity(0.4))
        .on_click((_e, cx) => this.pick(p, open, cx))
        .child(h_flex().flex_1().min_w(0)
          .when(Boolean(p.owner), (el) => el.child(div().text_size(15).font_mono().text_color(t.muted).child(`${p.owner}/`)))
          .child(div().flex_shrink().truncate().text_size(15).font_mono().font_bold().text_color(t.foreground).child(p.repo)))
        .when(this.starting === p.folder, (el) => el.child(svg("icons/ui/spinner.svg").size(18).text_color(t.foreground).spin(900)))
        .when(this.starting !== p.folder && Boolean(open), (el) => el.child(div().rounded(6).bg(t.accent + "26").px(6).py(2)
          .child(div().text_size(11).font_bold().text_color(t.accent).child("open")))));
    }
    return v_flex().w_full().h(600)
      .child(input("q").placeholder("Open a project").autofocus().mx(4).mb(8).min_h(48).px(14).rounded(10).bg(t.background).text_size(16).text_color(t.foreground)
        .on_change((e, cx) => {
          this.query = e.text;
          cx.notify();
        }))
      .when(this.projects === null, (el) => el.child(h_flex().justify_center().my(24).child(svg("icons/ui/spinner.svg").size(22).text_color(t.muted).spin(900))))
      .when(this.projects !== null && !rows.length, (el) => el.child(div().p(14).text_size(14).text_color(t.muted)
        .child(q ? `Nothing matches “${this.query}”.` : `No projects in ${PROJECT_PATHS.join(", ")}.`)))
      .when(this.errors.length > 0, (el) => el.child(div().px(14).text_size(12).text_color(t.muted).child(this.errors.join(" · "))))
      .child(v_flex().flex_1().overflow_y_scroll().children(rows));
  }

  // ---- A space's new agent ----

  startSheet(t, cx) {
    const s = spaces().find((x) => x.id === props().start);
    if (!s) return div().p(14).text_color(t.muted).child("That space is gone.");
    const list = this.installed ? AGENTS.filter((a) => this.installed.includes(a.cmd)) : AGENTS;
    return v_flex().w_full().px(4).pb(8)
      .child(h_flex().mx(14).mb(4).child(div().text_size(13).text_color(t.muted).child("New agent in ")).child(div().flex_shrink().truncate().text_size(13).font_bold().text_color(t.foreground).child(s.name)))
      .when(this.installed !== null && !list.length, (el) => el.child(div().p(14).text_size(14).text_color(t.muted).child(`Neither pi nor claude is installed on ${s.machine}.`)))
      .children(list.map((a) => h_flex().id(a.cmd).px(14).py(18).items_center().justify_between().rounded(10)
        .when(this.installed === null || (Boolean(this.starting) && this.starting !== a.cmd), (el) => el.opacity(0.4))
        .on_click((_e, cx) => {
          if (this.installed === null || this.starting) return;
          this.starting = a.cmd;
          cx.notify();
          run("tab.new", { space: s.id, argv: [a.cmd] })
            .then((r) => {
              closeOverlay(props().overlay);
              return run("terminal.show", { terminal: r.terminal });
            })
            .catch((e) => notify({ title: "Could not start it", body: e.message, level: "error" }));
        })
        .child(div().text_size(18).font_semibold().text_color(t.foreground).child(a.label))
        .when(this.starting === a.cmd, (el) => el.child(svg("icons/ui/spinner.svg").size(20).text_color(t.foreground).spin(900)))));
  }

  // ---- An agent's actions ----

  actionSheet(t) {
    const a = agents().find((x) => x.address === props().actions);
    const close = () => closeOverlay(props().overlay);
    if (!a) return div().p(14).text_color(t.muted).child("That agent is gone.");
    const live = a.state === "live";
    const action = (label, detail, f, danger) => v_flex().id(label).px(14).py(14).rounded(10)
      .on_click(() => {
        close();
        Promise.resolve(f()).catch((e) => notify({ title: "It did not work", body: e.message, level: "error" }));
      })
      .child(div().text_size(17).font_semibold().text_color(danger ? t.blocked : t.foreground).child(label))
      .when(Boolean(detail), (el) => el.child(div().mt(2).text_size(13).text_color(t.muted).child(detail)));
    return v_flex().w_full().px(4).pb(8)
      .child(v_flex().px(14).pb(8)
        .child(div().truncate().text_size(17).font_bold().text_color(t.foreground).child(title(a)))
        .child(div().truncate().mt(2).text_size(13).text_color(t.muted).child([a.machine, shortPath(a.cwd), live ? `started ${ago(a.createdAt)} ago` : "ended"].join(" · "))))
      .when(live, (el) => el.child(action("Interrupt", "Stop what it is doing", () => run("terminal.interrupt", { terminal: a.address }))))
      .child(action("Copy output", "Its screen and history", () => run("terminal.copy", { terminal: a.address }).then(() => notify({ title: "Output copied" }))))
      .when(live, (el) => el.child(action("Kill", "End its program; the session stays", () => run("terminal.kill", { terminal: a.address }), true)))
      .child(action("Close", "End it and remove the session", () => confirmClose(a), true));
  }

  render(cx) {
    const t = theme();
    const p = props();
    if (p.header) return roundButton("settings", 36, null, null, icon("settings-outline").size(24).text_color(t.foreground), () => run("app.settings"));
    if (p.projects) return this.projectSheet(t);
    if (p.start) return this.startSheet(t, cx);
    if (p.actions) return this.actionSheet(t);
    return this.home(t);
  }
}

// Lists <root>/<owner>/<repo> folders; paths are arguments, never shell source.
const PROBE = `
case "$1" in
  '~') root="$HOME" ;;
  '~/'*) root="$HOME/\${1#??}" ;;
  *) root="$1" ;;
esac
cd "$root" || exit 1
root="$(pwd -P)"
printf '%s\\n' "$root"
if [ "$2" = grouped ]; then set -- "$root"/*/*; else set -- "$root"/*; fi
for d do
  [ -d "$d" ] && printf '%s\\n' "\${d#"$root"/}"
done
true
`;
