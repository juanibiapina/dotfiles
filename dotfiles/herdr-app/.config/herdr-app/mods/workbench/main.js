import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, Scrollbar } from "gpui-base";
import { agents, terminals, spaces, focused, run, exec, theme, layout, setAgentOrder, shared, setShared } from "herdr";

import { readTextFile, home } from "herdr";
import { snapshot } from "./snapshot.js";
import { groupSessions, sessionDirs } from "./repos.js";
import { PROVIDERS, usageDue, fetchUsage, usageRows, pace } from "./usage.js";

const POLL = 3000;
const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };
// A machine's CPU and memory are sampled this often: top costs 0.4 s of CPU.
const SYSTEM_EVERY = 10000;
// PR details from GitHub refresh this often, or sooner when the set of PRs changes.
const PR_POLL = 60000;
// A refresh's calls time out after at most 80 s in all; one still busy after
// this never settled, and the next refresh starts without it.
const STUCK = 120000;
// Sessions whose last snapshot is kept, so switching back shows it at once.
const KEPT = 50;

// One round trip to the space's machine: origin, then GitButler's workspace.
// HEAD can sit on any branch, so `but status` succeeding is what marks one.
const WORKSPACE = `git remote get-url origin 2>/dev/null || echo
exec but status --json`;

// gh with the project's direnv environment, as the browse mod runs it.
const GH = `eval "$(direnv export sh 2>/dev/null)"; exec gh "$@"`;

const PR_FIELDS = "number title url state isDraft reviewDecision mergeStateStatus additions deletions totalCommentsCount reviewThreads(first: 100) { nodes { isResolved } }";

function githubRepo(remote) {
  const m = remote.match(/github\.com[^:/]*[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  return m ? { owner: m[1], name: m[2], slug: `${m[1]}/${m[2]}` } : null;
}

// but reports a branch's PR as its reviewId, "(#17273)".
const prNumber = (b) => Number(b.reviewId?.match(/#(\d+)/)?.[1]) || null;

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;
// dev factory pickup labels its terminals herdr.space=factory-<clone>.
const isFactory = (s) => (s.id.split("/").pop()).startsWith("factory-");
// The notes space on mini, opened with ctrl-space o (mods/notes).
const isNotes = (s) => s.machine === "mini" && s.named && s.name === "notes";
// `dev herdr snooze` labels a snoozed session juan.snooze=<time snoozed>.
const snoozedSet = () => new Set(terminals().filter((k) => k.labels?.["juan.snooze"]).map((k) => k.address));
const allSnoozed = (s, all, snoozed) => {
  const members = all.filter((a) => a.space === s.id);
  return members.length > 0 && members.every((a) => snoozed.has(a.address));
};
// Spaces by machine (this one first, then by machine name), then by name. Factory spaces, the notes space and spaces whose agents are all snoozed are hidden unless active; factory spaces sort last. tabs-juan's space-next/space-prev and agent-next/agent-prev keep the same order.
const byName = (a, b) => (a || "").localeCompare(b || "", undefined, { sensitivity: "base", numeric: true });
const sortedSpaces = (snoozed = snoozedSet()) => {
  const all = agents();
  return spaces().filter((s) => s.active || (!isFactory(s) && !isNotes(s) && !allSnoozed(s, all, snoozed))).sort((a, b) =>
    (a.machine !== null) - (b.machine !== null) || byName(a.machine, b.machine) ||
    isFactory(a) - isFactory(b) || byName(a.name, b.name));
};
const local = (address) => (address?.includes("/") ? address.split("/").pop() : address);
// The session a snapshot is about: its terminal, else its folder, on its machine.
const sessionKey = (target) => target && JSON.stringify([target.machine, target.terminal ?? target.dir]);

function span(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m${s % 60 ? `${s % 60}s` : ""}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h${m % 60 ? `${m % 60}m` : ""}`;
  return `${Math.floor(h / 24)}d${h % 24 ? `${h % 24}h` : ""}`;
}

// A time window by its pace: green while on track to stay under the limit by
// reset, yellow up to 130% projected, red beyond or once the limit is hit.
// Without a pace (extra usage, or the reset has passed), by its percent.
function usageColor(t, w, p) {
  if (!p) return level(t, w.usedPercent);
  if (w.usedPercent >= 100 || p.projected > 130) return t.ansi1;
  return p.projected > 100 ? t.ansi3 : t.ansi2;
}

// Green while fine, yellow when high, red when critical.
function level(t, percent, high = 60, critical = 80) {
  if (percent >= critical) return t.ansi1;
  if (percent >= high) return t.ansi3;
  return t.ansi2;
}

const agentName = (a, reports) => reports.get(a.address) || (a.tab_name && !/^\d+$/.test(a.tab_name) ? a.tab_name : a.program?.name || a.title);

// The whole sidebar: every space with its agents, then the focused session's
// jobs, then GitButler, system and usage at the bottom. snapshot.js
// gathers jobs and system from the active space's machine, refreshWorkspace
// asks it for GitButler's state, and usage.js fetches usage on this Mac.
export default class Workbench extends View {
  init(_props, cx) {
    // The last snapshot of each session, by sessionKey: only the focused
    // session's shows, so a refresh that fails or lags never shows another's.
    this.snaps = new Map();
    this.key = null;
    this.busy = false;
    this.busySince = 0;
    // Counts refreshes: only the latest one clears busy.
    this.runs = 0;
    this.again = false;
    // The last system sample per machine: { at, value }.
    this.systems = {};
    // Providers whose usage fetch is running, by shared key.
    this.usageBusy = new Set();
    // The checkouts the focused session is about: [{ repo, dir }] (repos.js).
    this.dirs = [];
    // GitButler's state per checkout folder, null outside a GitButler workspace.
    this.workspaces = {};
    this.workspaceBusy = false;
    // When each repo's PRs were last fetched, by slug: { key, at }.
    this.prPolls = {};
    // Agents whose child sessions show: every parent starts folded.
    this.expanded = new Set();
    this.parents = new Map();
    this.live = [];
    cx.timer.every(POLL, (cx) => {
      this.refresh(cx);
      this.refreshWorkspace(cx);
      this.refreshUsage(cx);
    });
    this.refreshUsage(cx);
  }

  refreshUsage(cx) {
    for (const provider of PROVIDERS) {
      const state = shared(provider.key) ?? {};
      if (this.usageBusy.has(provider.key) || !usageDue(state, Date.now())) continue;
      this.usageBusy.add(provider.key);
      const attempt = { ...state, attemptAt: Date.now() };
      setShared(provider.key, attempt);
      cx.spawn(async (cx) => {
        setShared(provider.key, await fetchUsage(provider, attempt, { readTextFile, fetch, home: home(), now: Date.now }));
        this.usageBusy.delete(provider.key);
        cx.notify();
      });
    }
  }

  // GitButler's applied branches for each of the session's checkouts, from
  // `but status`, then their PRs from GitHub.
  refreshWorkspace(cx) {
    const target = this.target();
    const dirs = this.dirs;
    if (!target || !dirs.length || this.workspaceBusy) return;
    this.workspaceBusy = true;
    cx.spawn(async (cx) => {
      await Promise.all(dirs.map(async ({ dir }) => {
        const key = JSON.stringify({ machine: target.machine, dir });
        try {
          const on = target.machine;
          const r = await exec("sh", ["-c", WORKSPACE], { cwd: dir, on });
          const [remote = "", ...rest] = r.stdout.split("\n");
          if (r.code !== 0) {
            this.workspaces[key] = null;
          } else {
            const repo = githubRepo(remote.trim());
            this.workspaces[key] = { repo, status: JSON.parse(rest.join("\n")) };
            cx.notify();
            if (repo) await this.refreshPrs(repo, this.workspaces[key].status, dir, on);
          }
        } catch (_error) {
          // Machine away, no but, or a half-written status: keep what we had.
        }
      }));
      this.workspaceBusy = false;
      cx.notify();
    });
  }

  workspaceOf(machine, dir) {
    return this.workspaces[JSON.stringify({ machine, dir })] ?? null;
  }

  async refreshPrs(repo, status, cwd, on) {
    const numbers = [...new Set(status.stacks.flatMap((s) => s.branches.map(prNumber)).filter(Boolean))].sort();
    const key = numbers.join(",");
    const last = this.prPolls[repo.slug];
    if (!numbers.length || (last?.key === key && Date.now() - last.at < PR_POLL)) return;
    this.prPolls[repo.slug] = { key, at: Date.now() };
    const query = `query { repository(owner: "${repo.owner}", name: "${repo.name}") { ${numbers.map((n) => `p${n}: pullRequest(number: ${n}) { ${PR_FIELDS} }`).join(" ")} } }`;
    const r = await exec("sh", ["-c", GH, "sh", "api", "graphql", "-f", `query=${query}`], { cwd, on });
    if (r.code !== 0) return;
    const found = Object.values(JSON.parse(r.stdout).data?.repository ?? {}).filter(Boolean);
    const all = shared("workbench.prs") ?? {};
    setShared("workbench.prs", { ...all, [repo.slug]: Object.fromEntries(found.map((p) => [p.number, p])) });
    // The browse mod (ctrl-space g) opens these without asking GitHub again.
    const names = new Map(status.stacks.flatMap((s) => s.branches).map((b) => [prNumber(b), b.name]));
    const browse = shared("browse.prs") ?? {};
    const links = Object.fromEntries(found.filter((p) => names.get(p.number)).map((p) => [names.get(p.number), { url: p.url, number: p.number, title: p.title }]));
    setShared("browse.prs", { ...browse, [repo.slug]: { ...browse[repo.slug], ...links } });
  }

  // What the snapshot is about: the active space's machine, the focused
  // terminal's folder, the Pi agent in the focused tab, and that agent's
  // labels, whose repos (repos.js) replace the folder's repo.
  target() {
    const f = focused();
    const space = spaces().find((s) => s.active);
    if (!f || !space) return null;
    const list = agents().filter((a) => a.tab === f.tab);
    const agent = list.find((a) => a.address === f.terminal) ?? list.find((a) => a.app === "pi") ?? list[0];
    const labels = terminals().find((k) => k.address === agent?.address)?.labels ?? {};
    return { machine: space.machine ?? null, dir: f.cwd || space.folder, terminal: agent?.address ?? null, labels };
  }

  refresh(cx) {
    const target = this.target();
    if (!target?.dir) return;
    if (this.busy && Date.now() - this.busySince < STUCK) {
      this.again = true;
      return;
    }
    const run = ++this.runs;
    this.busy = true;
    this.busySince = Date.now();
    cx.spawn(async (cx) => {
      try {
        const on = target.machine;
        const machine = on ?? "";
        const last = this.systems[machine];
        const sample = !last || Date.now() - last.at >= SYSTEM_EVERY;
        const found = await sessionDirs({ labels: target.labels, cwd: target.dir, machine: on }, exec);
        const dirs = found.length ? found : [{ repo: null, dir: target.dir }];
        if (run === this.runs) {
          const changed = JSON.stringify(dirs) !== JSON.stringify(this.dirs);
          this.dirs = dirs;
          if (changed) this.refreshWorkspace(cx);
        }
        // One snapshot per checkout; the first also reads the machine.
        const snaps = await Promise.all(dirs.map(({ dir }, i) => snapshot(
          { machine: on, dir },
          { exec },
          { system: i === 0 && sample })));
        if (sample) this.systems[machine] = { at: Date.now(), value: snaps[0].system ?? last?.value ?? null };
        const key = sessionKey(target);
        this.snaps.delete(key);
        this.snaps.set(key, { jobs: snaps.flatMap((s) => s.jobs), repos: dirs });
        if (this.snaps.size > KEPT) this.snaps.delete(this.snaps.keys().next().value);
      } catch (_error) {
        // Machine away: keep what we had.
      }
      // A newer refresh started after this one was given up as stuck.
      if (run !== this.runs) return;
      this.busy = false;
      cx.notify();
      if (this.again) {
        this.again = false;
        this.refresh(cx);
      }
    });
  }

  render(cx) {
    const t = theme();
    const snoozedIds = snoozedSet();
    const sorted = sortedSpaces(snoozedIds);
    const all = agents();
    const list = sorted.flatMap((s) => all.filter((a) => a.space === s.id && !snoozedIds.has(a.address)));
    const snoozed = all.filter((a) => snoozedIds.has(a.address));
    this.live = terminals().filter((k) => k.state === "live");
    this.parents = new Map(this.live.filter((k) => k.parent).map((k) => [k.address, k.parent]));
    // Spaces with their unlabelled sessions and a group per declared repo, together by name (repos.js).
    // A space without sessions is left out: the home space's sessions usually
    // declare a repo and move to that repo's group.
    const machineOf = new Map(spaces().map((s) => [s.id, s.machine ?? null]));
    const groups = groupSessions(sorted, list, terminals(), machineOf)
      .filter((g) => g.agents.length > 0);
    const paned = new Set(all.map((a) => a.address));
    const trees = groups.map((g) => this.tree(g.agents, paned));
    setAgentOrder(trees.flatMap((nodes) => nodes.filter((n) => !n.a.peek).map((n) => n.a.address)));
    if (narrow()) return this.narrowList(t, groups.flatMap((g) => g.agents));

    const target = this.target();
    const key = JSON.stringify(target);
    if (key !== this.key) {
      this.key = key;
      this.refresh(cx);
      this.refreshWorkspace(cx);
    }
    const snap = this.snaps.get(sessionKey(target)) ?? null;
    const system = target ? this.systems[target.machine ?? ""]?.value : null;
    const top = this.jobs(t, snap);
    const bottom = [this.repo(t, snap), this.system(t, system), this.usage(t)].filter(Boolean);
    // The sessions' height comes from their fixed rows: 24 px a group's header or the
    // Snoozed heading, 28 px a shown agent, plus the list's 6 px top and 8 px bottom padding.
    const shownRows = trees.reduce((n, nodes) => n + this.visible(nodes).length, 0);
    const sessionsHeight = 6 + 24 * groups.length + 28 * shownRows + (snoozed.length ? 24 + 28 * snoozed.length : 0) + 8;
    // Sessions always take their full height. Everything below them (jobs,
    // then GitButler, system and usage) scrolls as one area in the room left.
    // The area is absolute inside a sized box, since overflow_y_scrollbar()
    // wraps the element and its flex sizing would never reach the column.
    // Its content is at least as tall as the area, and the bottom part's auto
    // top margin keeps it at the bottom when everything fits.
    return v_flex().size_full().min_h(0).overflow_hidden().bg(t.chrome).border_t(1).border_color(t.border).text_size(13)
      .child(v_flex().id("wb-sessions").flex_none().h(sessionsHeight).px(8).pb(8)
        .child(this.sessions(t, groups, trees, snoozed)))
      .child(div().flex_1().min_h(0).relative()
        .child(v_flex().id("wb-below").absolute().inset_0().overflow_y_scroll()
          .child(v_flex().flex_none().min_h_full()
            .when(Boolean(top), (el) => el.child(v_flex().flex_none().px(8).pb(8)
              .border_t(1).border_color(t.border).child(top)))
            .when(bottom.length > 0, (el) => el.child(v_flex().flex_none().mt_auto().px(8).pb(10)
              .border_t(1).border_color(t.border).children(bottom)))))
        .child(Scrollbar.vertical("wb-below").absolute().inset_0()));
  }

  narrowList(t, list) {
    return v_flex().size_full().bg(t.chrome).border_t(1).border_color(t.border).pt(8).gap(2).items_center()
      .children(list.map((a) => h_flex().id(`ag-${a.address}`).h(26).w_full().items_center().justify_center()
        .when(a.focused, (el) => el.bg(t.selected))
        .hover((s) => s.bg(t.hover))
        .on_click(() => run("pane.focus", { pane: a.pane }))
        .child(this.status(t, a.status))));
  }

  heading(t, text, extra) {
    return h_flex().px(8).h(34).pt(12).pb(4).flex_none().items_center().justify_between()
      .child(div().text_size(11.5).font_semibold().text_color(t.ansi4).truncate().child(text))
      .when(Boolean(extra), (el) => el.child(extra));
  }

  status(t, status) {
    if (status === "working") return svg("mods/workspace-chrome/spinner.svg").size(12).mx(1).flex_none().text_color(t.working).spin(900);
    if (status === "blocked") return div().size(14).flex_none().rounded(4).bg(t.blocked + "26").text_size(10.5).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!");
    if (status === "done") return div().size(7).mx(3).flex_none().rounded(4).bg(t.done);
    return div().size(7).mx(3).flex_none().rounded(4).border(1.5).border_color(t.idle ?? t.dim);
  }

  row(t, id, { text, color, tail, onClick, height = 26, active = false }) {
    return h_flex().id(id).h(height).px(8).gap(8).flex_none().rounded(7).items_center().text_size(12.5)
      .when(active, (el) => el.bg(t.selected))
      .when(Boolean(onClick), (el) => el.cursor_pointer().hover((s) => s.bg(t.hover)).on_click(onClick))
      .child(div().flex_1().min_w(0).truncate().text_color(color ?? t.foreground).child(text))
      .when(Boolean(tail), (el) => el.child(tail));
  }

  glyph(text, color, width = 14) {
    return div().w(width).flex_none().text_size(11.5).text_color(color).child(text);
  }

  // mark, a percent, draws a tick across the bar there.
  bar(t, percent, color, width = 64, mark = null) {
    const p = Math.max(0, Math.min(100, percent ?? 0));
    return div().w(width).h(4).flex_none().rounded(2).bg(t.border).relative()
      .child(div().h_full().w(`${p}%`).rounded(2).bg(color))
      .when(mark != null, (el) => el.child(div().absolute().top(-2).h(8).w(1).left(`${mark}%`).bg(t.muted)));
  }

  // A space's agents as a tree, depth first, with their child sessions under
  // them: a listed agent whose parent is listed too, and live sub-agents
  // without a pane, which agents() leaves out (`peek` marks them; `paned` is
  // every agent with a pane, so a snoozed one isn't drawn twice).
  // Each node: { a, depth, kids (all descendants) }.
  tree(members, paned) {
    const listed = new Set(members.map((a) => a.address));
    const kidsOf = (address) => [
      ...members.filter((k) => this.parents.get(k.address) === address),
      ...this.live.filter((k) => k.parent === address && !paned.has(k.address)).map((k) => ({
        address: k.address,
        program: k.program,
        name: k.name || k.template || k.program?.name || k.address,
        // It reports to its parent, so its done is the parent's news.
        status: k.status === "error" ? "blocked" : k.status === "done" ? "idle" : k.status,
        peek: true,
      })),
    ];
    const walk = (a, depth) => {
      const below = kidsOf(a.address).flatMap((k) => walk(k, depth + 1));
      return [{ a, depth, kids: below.map((n) => n.a) }, ...below];
    };
    return members.filter((a) => !listed.has(this.parents.get(a.address))).flatMap((a) => walk(a, 0));
  }

  // The nodes a fold leaves showing: an agent's descendants show only while it is expanded.
  visible(nodes) {
    const hidden = new Set();
    for (const n of nodes) {
      if (hidden.has(n.a.address) || !this.expanded.has(n.a.address)) n.kids.forEach((k) => hidden.add(k.address));
    }
    return nodes.filter((n) => !hidden.has(n.a.address));
  }

  // The fold chevron of an agent with child sessions; folded, their count too,
  // colored by the most urgent of them.
  fold(t, a, kids) {
    const open = this.expanded.has(a.address);
    const top = kids.reduce((m, k) => ((RANK[k.status] ?? 0) > (RANK[m] ?? 0) ? k.status : m), null);
    return div().id(`fold-${a.address}`).h(18).px(3).gap(3).flex().flex_none().items_center().rounded(4)
      .text_size(11).text_color(open ? t.dim : ({ blocked: t.blocked, done: t.done }[top] ?? t.dim))
      .cursor_pointer().hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        open ? this.expanded.delete(a.address) : this.expanded.add(a.address);
        cx.notify();
      })
      .child(svg(`mods/workspace-chrome/chevron-${open ? "down" : "right"}.svg`).size(11).flex_none())
      .when(!open, (el) => el.child(String(kids.length)));
  }

  // Every space with sessions, by name, with its agents under it, then every
  // declared repo with the sessions working on it, child sessions folded under
  // their parent. Clicking a space's name shows that space. Snoozed sessions
  // come last, dim, under their own heading.
  sessions(t, groups, trees, snoozed) {
    const reports = new Map(terminals().map((k) => [k.address, k.report?.msg]));
    return v_flex().pt(6).children(groups.flatMap((g, i) => (g.kind === "space"
      ? this.space(t, g.space, trees[i], reports)
      : this.repoGroup(t, g, trees[i], reports))))
      .when(snoozed.length > 0, (el) => el.children(this.snoozed(t, snoozed, reports)));
  }

  // Clicking a snoozed session wakes it (dev herdr wake, on its machine) and shows it.
  snoozed(t, snoozed, reports) {
    const machineOf = new Map(spaces().map((s) => [s.id, s.machine ?? null]));
    return [
      h_flex().id("sp-snoozed").px(8).pt(4).h(24).flex_none().items_center().text_size(11).text_color(t.dim).child("Snoozed"),
      ...snoozed.map((a) => {
        const machine = machineOf.get(a.space) ?? null;
        return div().opacity(0.6).child(this.row(t, `zz-${a.address}`, {
          height: 28,
          text: agentName(a, reports),
          color: t.muted,
          tail: div().flex_none().text_size(11).text_color(t.dim).child([a.space_name, machine].filter(Boolean).join(" · ")),
          onClick: () => exec("dev", ["herdr", "wake", local(a.address)], { on: machine })
            .catch(() => {})
            .then(() => run("pane.focus", { pane: a.pane })),
        }));
      }),
    ];
  }

  space(t, s, nodes, reports) {
    // The space's name takes the color of its most urgent agent, so a blocked
    // or finished agent shows even when the list scrolls past its row.
    const nameColor = { blocked: t.blocked, done: t.done }[s.status] ?? (s.active ? t.accent : t.accent + "99");
    return [
      h_flex().id(`sp-${s.id}`).mx(0).px(8).pt(4).h(24).flex_none().items_center().gap(6).rounded(7)
        .text_size(11).text_color(nameColor).when(s.active, (el) => el.font_semibold())
        .cursor_pointer().hover((st) => st.text_color(t.foreground))
        .on_click(() => run("space.select", { id: s.id }))
        .child(div().flex_1().min_w(0).truncate().child(s.name || ""))
        .when(isFactory(s), (el) => el.child(div().flex_none().px(5).rounded(4).bg(t.accent + "26").text_size(10).font_normal().text_color(t.accent).child("factory")))
        .when(Boolean(s.machine), (el) => el.child(div().flex_none().font_normal().text_color(t.ansi6).child(s.machine))),
      ...this.members(t, nodes, reports),
    ];
  }

  // The sessions working on one repo (their current repo), under its name.
  // It has no space: clicking the name shows its first session.
  repoGroup(t, g, nodes, reports) {
    const top = g.agents.reduce((m, a) => ((RANK[a.status] ?? 0) > (RANK[m] ?? 0) ? a.status : m), null);
    const active = g.agents.some((a) => a.focused);
    const nameColor = { blocked: t.blocked, done: t.done }[top] ?? (active ? t.accent : t.accent + "99");
    const first = g.agents[0];
    return [
      h_flex().id(`rg-${g.machine ?? ""}-${g.repo}`).mx(0).px(8).pt(4).h(24).flex_none().items_center().gap(6).rounded(7)
        .text_size(11).text_color(nameColor).when(active, (el) => el.font_semibold())
        .cursor_pointer().hover((st) => st.text_color(t.foreground))
        .when(Boolean(first), (el) => el.on_click(() => run("pane.focus", { pane: first.pane })))
        .child(div().flex_1().min_w(0).truncate().child(g.repo.split("/").pop()))
        .when(Boolean(g.machine), (el) => el.child(div().flex_none().font_normal().text_color(t.ansi6).child(g.machine))),
      ...this.members(t, nodes, reports),
    ];
  }

  // A group's agent rows, child sessions indented under their parent.
  members(t, nodes, reports) {
    return [
      ...this.visible(nodes).map(({ a, depth, kids }) => {
        const folded = kids.length > 0 && !this.expanded.has(a.address);
        return div().pl(14 * depth).child(this.row(t, `ag-${a.address}`, {
          height: 28,
          // A folded parent stands for its focused child.
          active: a.focused || (folded && kids.some((k) => k.focused)),
          text: a.peek ? a.name : agentName(a, reports),
          color: a.peek ? t.muted : undefined,
          tail: kids.length
            ? h_flex().flex_none().gap(6).items_center().child(this.fold(t, a, kids)).child(this.status(t, a.status))
            : this.status(t, a.status),
          onClick: () => (a.peek ? run("terminal.peek", { terminal: a.address }) : run("pane.focus", { pane: a.pane })),
        }));
      }),
    ];
  }

  jobs(t, snap) {
    const jobs = snap?.jobs;
    if (!jobs?.length) return null;
    return v_flex().child(this.heading(t, "Jobs")).children(jobs.map((j) => {
      const known = j.typicalMs != null;
      const over = known && j.elapsedMs > j.upperMs;
      return v_flex().px(8).py(3).gap(3)
        .child(h_flex().gap(8).items_center()
          .child(div().size(7).mx(3).flex_none().rounded(4).bg(t.ansi2))
          .child(div().flex_1().min_w(0).truncate().text_size(12.5).child(j.name)))
        .when(known, (el) => el.child(h_flex().pl(21).gap(8).items_center()
          .child(div().flex_1().child(this.bar(t, (100 * j.elapsedMs) / j.upperMs, over ? t.ansi3 : t.ansi2, "100%")))
          .child(div().flex_none().text_size(10.5).text_color(over ? t.ansi3 : t.dim).child(`${span(j.elapsedMs)} / ~${span(j.typicalMs)}`))));
    }));
  }

  // A GitButler section per GitButler workspace checkout; with declared repos,
  // each heading names its repo. Plain Git checkouts show nothing.
  repo(t, snap) {
    const target = this.target();
    if (!target || !snap?.repos) return null;
    const sections = snap.repos.map((r, i) => {
      const title = (kind) => (r.repo ? `${kind} · ${r.repo.split("/").pop()}` : kind);
      const w = this.workspaceOf(target.machine, r.dir);
      return w ? this.gitbutler(t, w, title("GitButler"), i) : null;
    }).filter(Boolean);
    return sections.length ? v_flex().children(sections) : null;
  }

  // The applied branches, stack by stack, top of the stack first, as but status
  // draws them: a rail joins the branches of a stack, and the stacks sit on the
  // merge base at the bottom.
  gitbutler(t, w, title, n) {
    const prs = (w.repo && (shared("workbench.prs") ?? {})[w.repo.slug]) ?? {};
    const behind = w.status.upstreamState?.behind ?? 0;
    const uncommitted = w.status.uncommittedChanges?.length ?? 0;
    const stacks = w.status.stacks ?? [];
    const base = w.status.mergeBase;
    const count = stacks.length > 1 ? div().flex_none().text_size(10.5).text_color(t.dim).child(`${stacks.length} stacks`) : null;
    return v_flex()
      .child(this.heading(t, title, count))
      .when(uncommitted > 0, (el) => el.child(div().px(8).pb(2).text_size(11.5).text_color(t.ansi3).child(`~${uncommitted} unassigned ${uncommitted === 1 ? "change" : "changes"}`)))
      .when(stacks.length === 0, (el) => el.child(div().px(8).text_size(11.5).text_color(t.dim).child("No applied branches")))
      .children(stacks.map((s, i) => v_flex().id(`stack-${n}-${i}`).mt(i ? 8 : 0)
        .children(s.branches.map((b, j) => this.butBranch(t, b, prs[prNumber(b)], w.repo, j === 0 ? s.assignedChanges?.length ?? 0 : 0, n, j > 0, j < s.branches.length - 1)))))
      .when(Boolean(base?.commitId), (el) => el.child(h_flex().id(`base-${n}`).mt(6).px(8).h(20).gap(8).items_center().text_size(11)
        .tooltip(base.message?.split("\n")[0] ?? "")
        .child(div().w(13).flex_none().text_center().text_color(t.dim).child("┴"))
        .child(div().flex_none().text_color(t.muted).child(base.commitId.slice(0, 7)))
        .child(div().flex_1().min_w(0).truncate().text_color(t.dim).child(base.message?.split("\n")[0] ?? ""))
        .when(behind > 0, (row) => row.child(div().flex_none().text_color(t.ansi3).child(`↓${behind}`)))));
  }

  // A branch row: its node on the stack's rail, with the rail running up to the
  // branch above (above) and down to the branch below (below).
  butBranch(t, b, pr, repo, assigned, n, above, below) {
    const number = prNumber(b);
    const ci = b.ci;
    const failing = ci?.failingCheckTitles ?? [];
    const checks = failing.length + (ci?.pendingCheckTitles?.length ?? 0) + (ci?.passingCheckTitles?.length ?? 0);
    const check = !ci || (!checks && ci.conclusion === "unknown") ? null
      : failing.length || ci.conclusion === "failure" ? ["✗", t.ansi1]
      : ci.pendingCheckTitles?.length || ci.status !== "complete" ? ["●", t.ansi3]
      : ["✓", t.ansi2];
    const state = pr?.state === "MERGED" ? ["merged", t.ansi5]
      : pr?.state === "CLOSED" ? ["closed", t.ansi1]
      : pr?.isDraft ? ["draft", t.dim]
      : null;
    const prColor = state?.[1] ?? t.ansi2;
    const push = {
      completelyUnpushed: ["local", t.dim],
      unpushedCommits: ["↑ unpushed", t.ansi3],
      unpushedCommitsRequiringForce: ["↑ force push", t.ansi3],
      integrated: ["integrated", t.ansi5],
    }[b.branchStatus];
    const unresolved = pr?.reviewThreads?.nodes?.filter((n) => !n.isResolved).length ?? 0;
    const review = { APPROVED: ["✓ approved", t.ansi2], CHANGES_REQUESTED: ["✗ changes requested", t.ansi1] }[pr?.reviewDecision];
    const merge = { DIRTY: ["conflicts", t.ansi1], BEHIND: ["behind base", t.ansi3] }[pr?.mergeStateStatus];
    const commits = b.commits?.length ?? 0;
    const meta = [
      number && [`#${number}`, prColor],
      check,
      [`${commits} ${commits === 1 ? "commit" : "commits"}`, t.dim],
      b.commits?.some((c) => c.conflicted) && ["conflicted", t.ansi1],
      assigned > 0 && [`~${assigned} assigned`, t.ansi3],
      push,
      state,
      review,
      merge,
      unresolved > 0 && [`${unresolved} unresolved`, t.ansi3],
      pr && [`+${pr.additions}`, t.ansi2],
      pr && [`−${pr.deletions}`, t.ansi1],
    ].filter(Boolean);
    const url = pr?.url
      ?? (number && repo ? `https://github.com/${repo.slug}/pull/${number}` : null)
      ?? (repo && b.branchStatus !== "completelyUnpushed" ? `https://github.com/${repo.slug}/tree/${b.name}` : null);
    const tip = [pr && `#${pr.number} ${pr.title}`, failing.length && `Failing: ${failing.join(", ")}`].filter(Boolean).join("\n");
    const rail = t.ansi5 + "66";
    return h_flex().id(`but-${n}-${b.name}`).items_stretch().px(8).gap(8).flex_none().rounded(7)
      .when(Boolean(url), (el) => el.cursor_pointer().hover((s) => s.bg(t.hover)).on_click(() => exec("open", [url]).catch(() => {})))
      .when(Boolean(tip), (el) => el.tooltip(tip))
      .child(v_flex().w(13).flex_none().items_center()
        .child(div().w(2).h(6).flex_none().when(above, (el) => el.bg(rail)))
        .child(svg("mods/workspace-chrome/git-branch.svg").size(13).flex_none().text_color(t.ansi5))
        .child(div().w(2).flex_1().when(below, (el) => el.bg(rail))))
      .child(v_flex().flex_1().min_w(0).py(3).gap(1)
        .child(div().h(20).flex().items_center().text_size(12.5).child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(b.name)))
        .child(h_flex().gap_x(6).flex_wrap().text_size(11)
          .children(meta.map(([text, color]) => div().flex_none().text_color(color).child(text)))));
  }

  system(t, s) {
    if (!s) return null;
    const metric = (id, name, value, color) => value == null ? null : h_flex().id(id).h(22).px(8).gap(8).items_center().text_size(11.5)
      .child(div().w(34).flex_none().text_color(t.muted).child(name))
      .child(div().flex_1().child(this.bar(t, value, color, "100%")))
      .child(div().w(36).flex_none().text_right().text_color(color).child(`${value}%`));
    // A battery is fine when full: its level counts what is used up.
    const battery = s.battery && (s.battery.charging ? t.ansi2 : level(t, 100 - s.battery.percent, 70, 80));
    const rows = [
      metric("cpu", "CPU", s.cpu, level(t, s.cpu)),
      metric("mem", "MEM", s.memory, level(t, s.memory)),
      s.battery && metric("bat", s.battery.charging ? "BAT ⚡" : "BAT", s.battery.percent, battery),
    ].filter(Boolean);
    if (!rows.length) return null;
    return v_flex().child(this.heading(t, "System")).children(rows);
  }

  // One row per limit window, the provider's name on its first row: dim when
  // its last fetch failed, with a "·" once its data is stale.
  usage(t) {
    const groups = usageRows(shared, Date.now());
    if (!groups.length) return null;
    const now = Date.now() / 1000;
    return v_flex().child(this.heading(t, "Usage")).children(groups.flatMap((g) => g.windows.map((w, i) => {
      const p = pace(w, now);
      const color = usageColor(t, w, p);
      const name = i > 0 ? "" : g.stale ? `${g.name}·` : g.name;
      return h_flex().id(`usage-${g.name}-${i}`).h(22).px(8).gap(8).items_center().text_size(11.5)
        .child(div().w(52).flex_none().truncate().text_color(g.stale || g.failure ? t.dim : t.muted).child(name))
        .child(div().w(16).flex_none().text_color(w.active ? t.ansi3 : t.muted).child(w.name))
        .child(div().w(44).flex_none().text_size(10.5).text_color(w.active ? t.ansi3 : t.dim)
          .child(w.detail ?? (w.resetAt ? span((w.resetAt - now) * 1000) : "")))
        .child(div().flex_1().child(this.bar(t, w.usedPercent, color, "100%", p?.expected)))
        .child(div().w(36).flex_none().text_right().text_color(color).child(`${Math.round(w.usedPercent)}%`));
    })));
  }

}
