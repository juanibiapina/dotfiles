import { View, div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { agents, terminals, spaces, focused, run, exec, theme, layout, setAgentOrder } from "herdr";

const POLL = 3000;
const MAX_COMMITS = 3;

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;
const local = (address) => (address?.includes("/") ? address.split("/").pop() : address);

function span(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m${s % 60 ? `${s % 60}s` : ""}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h${m % 60 ? `${m % 60}m` : ""}`;
  return `${Math.floor(h / 24)}d${h % 24 ? `${h % 24}h` : ""}`;
}

function windowName(w) {
  const d = w.durationSeconds;
  if (!d) return w.label;
  return d % 86400 === 0 ? `${d / 86400}d` : `${Math.round(d / 3600)}h`;
}

function prLabel(url) {
  const m = /github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/.exec(url);
  return m ? `${m[1]}#${m[2]}` : url;
}

function icon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

export default class Workbench extends View {
  init(_props, cx) {
    this.snapshot = null;
    this.key = null;
    this.busy = false;
    this.again = false;
    this.pids = {};
    cx.timer.every(POLL, (cx) => this.refresh(cx));
  }

  // What the snapshot is about: the active space's machine, the focused
  // terminal's folder, and the Pi agent in the focused tab.
  target() {
    const f = focused();
    const space = spaces().find((s) => s.active);
    if (!f || !space) return null;
    const list = agents().filter((a) => a.tab === f.tab);
    const agent = list.find((a) => a.address === f.terminal) ?? list.find((a) => a.app === "pi") ?? list[0];
    return { machine: space.machine ?? null, dir: f.cwd || space.folder, terminal: agent?.address ?? null };
  }

  refresh(cx) {
    const target = this.target();
    if (!target?.dir) return;
    if (this.busy) {
      this.again = true;
      return;
    }
    this.busy = true;
    cx.spawn(async (cx) => {
      try {
        const on = target.machine;
        let pid = target.terminal ? this.pids[target.terminal] : null;
        if (target.terminal && pid == null) {
          const r = await exec("hc", ["get", local(target.terminal), "--json"], { on });
          pid = JSON.parse(r.stdout).pid ?? null;
          if (pid) this.pids[target.terminal] = pid;
        }
        const args = ["snapshot", "--dir", target.dir, ...(pid ? ["--pid", String(pid)] : [])];
        const r = await exec("starmux", args, { on });
        if (r.code === 0) {
          this.snapshot = JSON.parse(r.stdout);
          this.snapshotKey = JSON.stringify(target);
        }
      } catch (_error) {
        // Machine away or starmux too old: keep what we had.
      }
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
    const target = this.target();
    const key = JSON.stringify(target);
    if (key !== this.key) {
      this.key = key;
      this.refresh(cx);
    }
    const snap = this.snapshotKey && JSON.parse(this.snapshotKey)?.machine === target?.machine ? this.snapshot : null;
    const list = agents();
    setAgentOrder(list.map((a) => a.address));

    if (narrow()) {
      return v_flex().size_full().bg(t.chrome).border_t(1).border_color(t.border).pt(8).gap(2).items_center()
        .children(list.map((a) => h_flex().id(`ag-${a.address}`).h(26).w_full().items_center().justify_center()
          .when(a.focused, (el) => el.bg(t.selected))
          .hover((s) => s.bg(t.hover))
          .on_click(() => run("pane.focus", { pane: a.pane }))
          .child(this.status(t, a.status))));
    }

    const top = [this.sessions(t, list), this.context(t, snap), this.jobs(t, snap)].filter(Boolean);
    const bottom = [this.repo(t, snap), this.system(t, snap), this.usage(t, snap)].filter(Boolean);
    return v_flex().size_full().min_h(0).bg(t.chrome).border_t(1).border_color(t.border).text_size(13)
      .child(v_flex().id("wb-top").flex_1().min_h(0).px(8).pb(8).overflow_y_scrollbar().children(top))
      .when(bottom.length > 0, (el) => el.child(v_flex().flex_none().px(8).pb(10).border_t(1).border_color(t.border).children(bottom)));
  }

  heading(t, text, extra) {
    return h_flex().px(8).h(34).pt(12).pb(4).flex_none().items_center().justify_between()
      .child(div().text_size(11.5).font_medium().text_color(t.dim).truncate().child(text))
      .when(Boolean(extra), (el) => el.child(extra));
  }

  label(t, text) {
    return div().px(8).pt(6).pb(2).flex_none().text_size(11).text_color(t.dim).child(text);
  }

  status(t, status) {
    if (status === "working") return svg("mods/workspace-chrome/spinner.svg").size(12).mx(1).flex_none().text_color(t.working).spin(900);
    if (status === "blocked") return div().size(14).flex_none().rounded(4).bg(t.blocked + "26").text_size(10.5).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!");
    if (status === "done") return div().size(7).mx(3).flex_none().rounded(4).bg(t.done);
    return div().size(7).mx(3).flex_none().rounded(4).border(1.5).border_color(t.idle ?? t.dim);
  }

  row(t, id, { lead, text, color, tail, onClick, height = 26, active = false }) {
    return h_flex().id(id).h(height).px(8).gap(8).flex_none().rounded(7).items_center().text_size(12.5)
      .when(active, (el) => el.bg(t.selected))
      .when(Boolean(onClick), (el) => el.cursor_pointer().hover((s) => s.bg(t.hover)).on_click(onClick))
      .when(Boolean(lead), (el) => el.child(lead))
      .child(div().flex_1().min_w(0).truncate().text_color(color ?? t.foreground).child(text))
      .when(Boolean(tail), (el) => el.child(tail));
  }

  glyph(text, color, width = 14) {
    return div().w(width).flex_none().text_size(11.5).text_color(color).child(text);
  }

  bar(t, percent, color, width = 64) {
    const p = Math.max(0, Math.min(100, percent ?? 0));
    return div().w(width).h(4).flex_none().rounded(2).bg(t.border).child(div().h_full().w(`${p}%`).rounded(2).bg(color));
  }

  sessions(t, list) {
    if (list.length === 0) return null;
    const reports = new Map(terminals().map((k) => [k.address, k.report?.msg]));
    const groups = [];
    for (const a of list) {
      if (groups.at(-1)?.space !== a.space) groups.push({ space: a.space, name: a.space_name, members: [] });
      groups.at(-1).members.push(a);
    }
    const machineOf = (a) => (a.address.includes("/") ? a.address.split("/")[0] : null);
    return v_flex().child(this.heading(t, "Sessions")).children(groups.flatMap((g) => [
      h_flex().px(8).pt(4).h(24).flex_none().items_center().gap(6).text_size(11).font_medium().text_color(t.muted)
        .child(div().truncate().child(g.name || "")).when(Boolean(machineOf(g.members[0])), (el) => el.child(div().text_color(t.dim).child(machineOf(g.members[0])))),
      ...g.members.map((a) => {
        const name = reports.get(a.address) || (a.tab_name && !/^\d+$/.test(a.tab_name) ? a.tab_name : a.program?.name || a.title);
        return this.row(t, `ag-${a.address}`, {
          height: 28,
          active: a.focused,
          lead: icon(a.program, 14, t.muted),
          text: name,
          color: a.status === "idle" && !a.focused ? t.muted : t.foreground,
          tail: this.status(t, a.status),
          onClick: () => run("pane.focus", { pane: a.pane }),
        });
      }),
    ]));
  }

  context(t, snap) {
    const pi = snap?.pi;
    const c = pi?.context;
    if (!c) return null;
    const open = (target) => () => exec("open", [target]).catch(() => {});
    const remote = Boolean(this.target()?.machine);
    const prColor = (pr) => t[{ success: "ansi2", failure: "ansi1", pending: "ansi3" }[pr.build]] ?? {
      open: t.ansi2, draft: t.dim, merged: t.ansi5, closed: t.ansi1,
    }[pr.state] ?? t.dim;
    const buildGlyph = { success: ["✓", t.ansi2], failure: ["✗", t.ansi1], pending: ["●", t.ansi3], none: ["·", t.dim] };
    const parts = [];
    if (c.plans.length) {
      parts.push(this.label(t, "Plans"), ...c.plans.map((p, i) => this.row(t, `plan-${i}`, {
        lead: svg("mods/workspace-chrome/file-text.svg").size(13).flex_none().text_color(t.ansi5),
        text: p.title,
        onClick: p.url && !remote ? open(p.url) : null,
      })));
    }
    if (c.pullRequests.length) {
      parts.push(this.label(t, "Pull requests"), ...c.pullRequests.map((p, i) => this.row(t, `pr-${i}`, {
        lead: svg("mods/workspace-chrome/git-compare.svg").size(13).flex_none().text_color(prColor(p)),
        text: prLabel(p.url),
        onClick: open(p.url),
      })));
    }
    if (c.builds.length) {
      parts.push(this.label(t, "Builds"), ...c.builds.map((b, i) => {
        const [g, color] = buildGlyph[b.state] ?? buildGlyph.none;
        return this.row(t, `build-${i}`, { lead: this.glyph(g, color, 13), text: `${b.repository.split("/").pop()}:${b.branch}`, onClick: open(b.url) });
      }));
    }
    if (c.skills.length) {
      parts.push(this.label(t, "Skills"), h_flex().px(8).pb(2).flex_wrap().gap(4).children(c.skills.map((s, i) =>
        div().id(`skill-${i}`).px(6).h(20).flex().items_center().rounded(5).bg(t.raised).text_size(11).text_color(t.muted)
          .when(Boolean(s.path) && !remote, (el) => el.cursor_pointer().hover((st) => st.bg(t.hover).text_color(t.foreground)).on_click(open(s.path)))
          .child(s.name))));
    }
    if (!parts.length) return null;
    return v_flex().child(this.heading(t, pi.session.name)).children(parts);
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

  repo(t, snap) {
    if (snap?.gitbutler) return this.gitbutler(t, snap.gitbutler);
    if (snap?.git) return this.git(t, snap.git);
    return null;
  }

  git(t, g) {
    const counts = [
      [g.conflicts, `!${g.conflicts}`, t.ansi1],
      [g.staged, `+${g.staged}`, t.ansi2],
      [g.modified, `~${g.modified}`, t.ansi3],
      [g.untracked, `?${g.untracked}`, t.dim],
      [g.stash, `≡${g.stash}`, t.dim],
      [g.added, `+${g.added}`, t.ansi2],
      [g.deleted, `−${g.deleted}`, t.ansi1],
    ].filter(([n]) => n > 0);
    const divergence = [g.ahead && `↑${g.ahead}`, g.behind && `↓${g.behind}`].filter(Boolean).join(" ");
    return v_flex().child(this.heading(t, "Git"))
      .child(this.row(t, "git-branch", {
        lead: svg("mods/workspace-chrome/git-branch.svg").size(13).flex_none().text_color(t.muted),
        text: g.branch,
        tail: div().flex_none().text_size(11).text_color(t.dim).child([g.upstream, divergence].filter(Boolean).join("  ")),
      }))
      .child(h_flex().px(8).pl(29).h(22).gap(8).items_center().text_size(11.5)
        .when(g.clean, (el) => el.child(div().text_color(t.ansi2).child("✓ clean")))
        .children(counts.map(([, text, color]) => div().text_color(color).child(text)))
        .when(Boolean(g.state), (el) => el.child(div().text_color(t.ansi1).child(g.state))));
  }

  gitbutler(t, w) {
    const push = {
      pushed: ["●", t.ansi2], unpushed: ["↑", t.ansi3], force: ["⇡", t.ansi1], local: ["○", t.dim], integrated: ["✓", t.ansi5],
    };
    const ci = { success: ["✓", t.ansi2], failure: ["✗", t.ansi1], pending: ["●", t.ansi3] };
    const parts = [];
    if (w.base) {
      parts.push(this.row(t, "gb-base", {
        lead: svg("mods/workspace-chrome/git-branch.svg").size(13).flex_none().text_color(t.muted),
        text: w.base.message,
        color: t.muted,
        tail: h_flex().gap(6).flex_none().text_size(11).text_color(t.dim).child(w.base.id)
          .when(w.behind > 0, (el) => el.child(div().text_color(t.ansi3).child(`↓${w.behind}`))),
      }));
    }
    if (w.unassignedChanges > 0) {
      parts.push(this.row(t, "gb-unassigned", { lead: this.glyph("◆", t.ansi3, 13), text: `${w.unassignedChanges} unassigned`, color: t.muted }));
    }
    w.branches.forEach((b, i) => {
      const [pg, pc] = push[b.push] ?? push.local;
      const tail = h_flex().gap(6).flex_none().text_size(11).items_center()
        .when(b.commits > 0, (el) => el.child(div().text_color(t.dim).child(String(b.commits))))
        .when(b.changes > 0, (el) => el.child(div().text_color(t.ansi3).child(`~${b.changes}`)))
        .when(Boolean(b.review), (el) => el.child(div().text_color(t.ansi4).child(`#${b.review}`)))
        .when(Boolean(ci[b.ci]), (el) => el.child(div().text_color(ci[b.ci][1]).child(ci[b.ci][0])))
        .when(b.conflicted, (el) => el.child(div().text_color(t.ansi1).child("⚠")));
      parts.push(this.row(t, `gb-${i}`, {
        lead: h_flex().flex_none().items_center().when(b.depth > 0, (el) => el.child(div().w(12).text_color(t.dim).child("└"))).child(this.glyph(pg, pc, 13)),
        text: b.name,
        tail,
      }));
      b.recentCommits.slice(0, MAX_COMMITS).forEach((c, j) => parts.push(
        h_flex().h(20).pl(29 + (b.depth > 0 ? 12 : 0)).pr(8).gap(6).items_center().text_size(11.5)
          .child(div().flex_none().text_color(c.conflicted ? t.ansi1 : t.dim).child(c.conflicted ? "⚠" : "·"))
          .child(div().flex_1().min_w(0).truncate().text_color(t.muted).child(c.message))
          .id(`gb-${i}-${j}`)));
      if (b.recentCommits.length > MAX_COMMITS) {
        parts.push(div().h(18).pl(41).text_size(11).text_color(t.dim).child(`… ${b.commits - MAX_COMMITS} more`));
      }
    });
    if (w.conflictedFiles > 0) parts.push(this.row(t, "gb-conflicts", { lead: this.glyph("⚠", t.ansi1, 13), text: `${w.conflictedFiles} conflicted files`, color: t.ansi1 }));
    return v_flex().child(this.heading(t, "GitButler")).children(parts);
  }

  system(t, snap) {
    const s = snap?.system;
    if (!s) return null;
    const metric = (id, name, value, critical) => value == null ? null : h_flex().id(id).h(22).px(8).gap(8).items_center().text_size(11.5)
      .child(div().w(34).flex_none().text_color(t.dim).child(name))
      .child(div().flex_1().child(this.bar(t, value, critical ? t.ansi1 : t.accent, "100%")))
      .child(div().w(36).flex_none().text_right().text_color(critical ? t.ansi1 : t.muted).child(`${value}%`));
    const rows = [
      metric("cpu", "CPU", s.cpu, s.cpu >= 80),
      metric("mem", "MEM", s.memory, s.memory >= 80),
      s.battery && metric("bat", s.battery.charging ? "BAT ⚡" : "BAT", s.battery.percent, s.battery.percent <= 20),
    ].filter(Boolean);
    if (!rows.length) return null;
    return v_flex().child(this.heading(t, "System")).children(rows);
  }

  usage(t, snap) {
    const rows = snap?.usage?.filter((u) => u.windows.length);
    if (!rows?.length) return null;
    const now = Date.now() / 1000;
    return v_flex().children(rows.map((u) => v_flex()
      .child(this.heading(t, u.name, u.stale || u.failure ? div().text_size(10.5).text_color(t.dim).child(u.stale ? "stale" : "cached") : null))
      .children(u.windows.map((w, i) => {
        const critical = w.usedPercent >= 80;
        return h_flex().id(`usage-${u.provider}-${i}`).h(22).px(8).gap(8).items_center().text_size(11.5)
          .child(div().w(34).flex_none().text_color(t.dim).child(windowName(w)))
          .child(div().w(44).flex_none().text_size(10.5).text_color(t.dim).child(w.resetAt ? span((w.resetAt - now) * 1000) : ""))
          .child(div().flex_1().child(this.bar(t, w.usedPercent, critical ? t.ansi1 : t.accent, "100%")))
          .child(div().w(36).flex_none().text_right().text_color(critical ? t.ansi1 : t.muted).child(`${Math.round(w.usedPercent)}%`));
      }))));
  }
}
