// The pages: a pull request (checks first), its files, an issue, a release,
// a workflow's runs, a run, and a job's log.

import { div, h_flex, v_flex, icon } from "herdr-ui";
import { run, notify, openOverlay, safeArea, props } from "herdr";
import * as api from "./api.js";
import { markdown } from "./md.js";
import { open } from "./inbox.js";
import { ago, duration, bytes, avatar, chip, label, prState, issueState, stateChip, checkIcon, checkLook, runState, card, sectionTitle, spinner, button, placeholder } from "./ui.js";

const copy = (text, what) => run("clipboard.copy", { text }).then(() => notify({ title: `${what} copied` }));
const sheet = (p) => openOverlay({ mod: "github", kind: "sheet", props: p });

/** Loads data into the view; shows the old data while it reloads. */
function loader(v, f) {
  v.reload = (cx) => {
    if (v.loading) return;
    v.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        v.data = await f();
        v.mdCache = new Map();
        v.error = null;
      } catch (e) {
        v.error = api.errorText(e);
      }
      v.loading = false;
      cx.notify();
    });
  };
}

// QuickJS has ~250 ms per render: build each body once, and again only
// when its own folds (long code blocks), its data or the theme change.
function md(v, t, body, key, size) {
  if (v.mdTheme !== t) {
    v.mdCache = new Map();
    v.mdTheme = t;
  }
  const folds = [...v.expanded].filter((x) => x.startsWith(`${key}.`)).join(",");
  const k = `${key}|${size ?? 15}|${body.length}|${folds}`;
  let el = v.mdCache.get(k);
  if (!el) {
    el = markdown(body, { t, size, key, link: (url) => v.link(url), expanded: v.expanded, toggle: v.toggle });
    v.mdCache.set(k, el);
  }
  return el;
}

// Long comments start folded at a paragraph break outside code.
const FOLD = 1000;
function folded(body) {
  let cut = body.lastIndexOf("\n\n", 600);
  if (cut < 200) cut = body.indexOf("\n", 600);
  if (cut < 0 || cut > 900) cut = 600;
  const before = body.slice(0, cut);
  if ((before.match(/^\s*(```|~~~)/gm) ?? []).length % 2) cut = before.search(/^\s*(```|~~~)(?![\s\S]*^\s*(```|~~~))/m);
  return body.slice(0, Math.max(cut, 0)).trimEnd();
}

function page(v, t, body, bar) {
  return v_flex().size_full().bg(t.background)
    .child(v_flex().flex_1().overflow_y_scroll().on_refresh((_e, cx) => v.reload(cx))
      .when(Boolean(v.error && v.data), (el) => el.child(h_flex().id("err").mx(12).mt(8).p(10).gap(8).rounded(8).bg(t.blocked + "22")
        .child(icon("warning-outline").size(16).text_color(t.blocked))
        .child(div().flex_1().text_size(13).text_color(t.blocked).child(v.error))))
      .child(body)
      .child(div().id("end").h(32)))
    .when(Boolean(bar), (el) => el.child(h_flex().id("bar").px(12).pt(10).pb(10 + safeArea().bottom).gap(8).bg(t.chrome).border_t(1).border_color(t.border).children(bar)));
}

function titleBlock(v, t, { where, title, chips, meta }) {
  return v_flex().id("title").px(16).pt(14).pb(6).gap(10)
    .child(h_flex().gap(8).items_center()
      .child(div().flex_1().truncate().text_size(13).font_mono().text_color(t.muted).child(where))
      .when(Boolean(v.loading), (el) => el.child(spinner(t, 16))))
    .child(div().text_size(21).font_bold().line_height(27).text_color(t.foreground).child(title))
    .child(h_flex().flex_wrap().gap(8).items_center().children(chips))
    .when(Boolean(meta), (el) => el.child(meta));
}

// A comment box: who, when, the body.
function comment(v, t, { id, user, at, body, badge, accent, children }) {
  const long = body && body.length > FOLD;
  const open = v.expanded.has(`full.${id}`);
  const shown = long && !open ? folded(body) : body;
  return card(t).id(id).mb(10).border_color(accent ?? t.border)
    .child(h_flex().px(12).py(10).gap(10).items_center().bg(accent ? accent + "14" : t.raised)
      .child(avatar(t, user, 26))
      .child(div().flex_1().truncate().text_size(14).font_semibold().text_color(t.foreground).child(user ?? "ghost"))
      .when(Boolean(badge), (el) => el.child(badge))
      .child(div().text_size(12).text_color(t.dim).child(ago(at))))
    .when(Boolean(shown && shown.trim()), (el) => el.child(div().px(14).py(12).child(md(v, t, shown, `c${id}`))))
    .when(long, (el) => el.child(h_flex().id("full").h(40).px(14).gap(6).items_center().border_t(1).border_color(t.border)
      .on_click((_e, cx) => v.toggle(`full.${id}`, cx))
      .child(icon(open ? "chevron-up" : "chevron-down").size(14).text_color(t.accent))
      .child(div().text_size(13).text_color(t.accent).child(open ? "Show less" : "Show full comment"))))
    .when(Boolean(children), (el) => el.children(children));
}

const doneThread = (v) => {
  const n = props().thread;
  return n ? { thread: n } : {};
};

// ---- Checks ----

const ORDER = { fail: 0, pending: 1, cancel: 2, neutral: 3, pass: 4, skip: 5 };

export function normCheck(c) {
  if (c.__typename === "StatusContext") {
    const s = c.state;
    return { name: c.context, workflow: c.description ?? "", state: s === "SUCCESS" ? "pass" : s === "PENDING" || s === "EXPECTED" ? "pending" : "fail", url: c.targetUrl, started: c.startedAt };
  }
  const state = c.status !== "COMPLETED" ? "pending"
    : { SUCCESS: "pass", NEUTRAL: "neutral", SKIPPED: "skip", FAILURE: "fail", TIMED_OUT: "fail", CANCELLED: "cancel", ACTION_REQUIRED: "fail", STARTUP_FAILURE: "fail", STALE: "skip" }[c.conclusion] ?? "neutral";
  const m = c.detailsUrl && c.detailsUrl.match(/\/actions\/runs\/(\d+)\/job\/(\d+)/);
  return { name: c.name, workflow: c.workflowName ?? "", state, url: c.detailsUrl, run: m ? Number(m[1]) : null, job: m ? Number(m[2]) : null, started: c.startedAt, completed: c.completedAt };
}

function checksCard(v, t, pr) {
  const checks = (pr.statusCheckRollup ?? []).map(normCheck).sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.name.localeCompare(b.name));
  const count = (s) => checks.filter((c) => c.state === s).length;
  const fail = count("fail");
  const pending = count("pending");
  const head = fail ? { state: "fail", text: `${fail} failing check${fail > 1 ? "s" : ""}` }
    : pending ? { state: "pending", text: `${pending} check${pending > 1 ? "s" : ""} running` }
      : checks.length ? { state: "pass", text: "All checks passed" } : { state: "neutral", text: "No checks" };
  const parts = [["fail", "failing"], ["pending", "running"], ["cancel", "cancelled"], ["pass", "passed"], ["neutral", "neutral"], ["skip", "skipped"]]
    .map(([s, w]) => (count(s) ? `${count(s)} ${w}` : null)).filter(Boolean).join(" · ");
  const open = v.expanded.has("checks");
  const important = checks.filter((c) => ORDER[c.state] <= 1);
  const shown = open ? checks : important;
  const failedRuns = [...new Set(checks.filter((c) => c.state === "fail" && c.run).map((c) => c.run))];
  const look = checkLook(t, head.state);
  return card(t).id("checks").mt(6).border_color(head.state === "fail" ? t.blocked + "88" : t.border)
    .child(h_flex().id("head").px(14).py(12).gap(12).items_center().bg(look.color + "14")
      .on_click((_e, cx) => v.toggle("checks", cx))
      .child(checkIcon(t, head.state, 26))
      .child(v_flex().flex_1().min_w(0)
        .child(div().text_size(16).font_bold().text_color(t.foreground).child(head.text))
        .when(Boolean(parts), (el) => el.child(div().mt(2).text_size(12).text_color(t.muted).child(parts))))
      .when(checks.length > important.length, (el) => el.child(icon(open ? "chevron-up" : "chevron-down").size(18).text_color(t.muted))))
    .children(shown.map((c, i) => h_flex().id(`c${i}`).min_h(50).px(14).py(8).gap(12).items_center().border_t(1).border_color(t.border)
      .on_click(() => sheet({ sheet: "check", check: c, repo: pr.repo, number: pr.number }))
      .child(checkIcon(t, c.state, 18))
      .child(v_flex().flex_1().min_w(0)
        .child(div().truncate().text_size(14).text_color(t.foreground).child(c.name))
        .child(div().truncate().text_size(12).text_color(t.dim).child([c.workflow, c.state === "pending" ? (c.started ? `started ${ago(c.started)} ago` : "queued") : duration(c.started, c.completed)].filter(Boolean).join(" · "))))
      .child(icon("chevron-forward").size(16).text_color(t.dim))))
    .when(!open && checks.length > important.length, (el) => el.child(h_flex().id("more").h(40).px(14).items_center().border_t(1).border_color(t.border)
      .on_click((_e, cx) => v.toggle("checks", cx))
      .child(div().text_size(13).text_color(t.accent).child(`Show ${checks.length - important.length} more`))))
    .when(failedRuns.length > 0 && pr.state === "OPEN", (el) => el.child(h_flex().id("rerun").px(12).py(10).gap(8).border_t(1).border_color(t.border)
      .child(button(t, "rerun-failed", v.busy === "rerun" ? "Re-running…" : "Re-run failed jobs", {
        icon: "refresh", flex: true, busy: v.busy === "rerun",
        action: (_e, cx) => v.act(cx, "rerun", () => Promise.all(failedRuns.map((r) => api.rerun({ repo: pr.repo, run: r }, true))), "Re-running failed jobs"),
      }))));
}

// ---- Pull request ----

function reviewLook(t, state) {
  return {
    APPROVED: { icon: "checkmark-circle", color: t.done, verb: "approved" },
    CHANGES_REQUESTED: { icon: "close-circle", color: t.blocked, verb: "requested changes" },
    COMMENTED: { icon: "chatbubble-ellipses-outline", color: t.muted, verb: "reviewed" },
    DISMISSED: { icon: "remove-circle-outline", color: t.dim, verb: "review dismissed" },
    PENDING: { icon: "time-outline", color: t.working, verb: "pending review" },
  }[state] ?? { icon: "chatbubble-outline", color: t.muted, verb: "reviewed" };
}

function hunkTail(t, hunk) {
  const lines = (hunk ?? "").split("\n").slice(-4);
  return div().overflow_x_scroll().bg(t.canvas).child(v_flex().px(10).py(6)
    .children(lines.map((l, i) => div().id(i).whitespace_nowrap().font_mono().text_size(11).line_height(16)
      .text_color(l.startsWith("+") ? t.done : l.startsWith("-") ? t.blocked : l.startsWith("@@") ? t.ansi6 : t.muted).child(l || " "))));
}

// Folded to one row until tapped: threads are most of a busy PR's elements.
function thread(v, t, root, replies) {
  const key = `th${root.id}`;
  const open = v.expanded.has(key);
  const all = [root, ...replies];
  const box = v_flex().id(key).mx(12).mb(12).rounded(10).border(1).border_color(t.border).overflow_hidden()
    .child(h_flex().id("h").min_h(36).px(10).py(6).gap(6).items_center().bg(t.raised)
      .on_click((_e, cx) => v.toggle(key, cx))
      .child(icon(open ? "chevron-down" : "chevron-forward").size(14).text_color(t.muted))
      .child(div().flex_1().truncate().font_mono().text_size(12).text_color(t.muted).child(`${root.path}${root.line ? `:${root.line}` : ""}`))
      .when(root.outdated, (el) => el.child(chip(t, "Outdated", t.working))));
  if (!open) {
    return box.child(h_flex().id("peek").px(12).py(10).gap(8).items_start()
      .on_click((_e, cx) => v.toggle(key, cx))
      .child(avatar(t, root.user, 20))
      .child(div().flex_1().line_clamp(2).text_size(13).text_color(t.foreground).child(root.body.replace(/\s+/g, " ").slice(0, 200)))
      .when(replies.length > 0, (el) => el.child(chip(t, `+${replies.length}`, t.muted, { icon: "chatbubbles-outline" }))));
  }
  return box
    .child(hunkTail(t, root.hunk))
    .children(all.map((c) => v_flex().id(c.id).px(12).py(10).gap(6).border_t(1).border_color(t.border)
      .child(h_flex().gap(8).items_center()
        .child(avatar(t, c.user, 20))
        .child(div().flex_1().text_size(13).font_semibold().text_color(t.foreground).child(c.user))
        .child(div().text_size(12).text_color(t.dim).child(ago(c.created_at))))
      .child(md(v, t, c.body, `ic${c.id}`, 14))));
}

function timeline(v, t, pr) {
  const roots = pr.inline.filter((c) => !c.reply);
  const replies = new Map();
  for (const c of pr.inline) if (c.reply) replies.set(c.reply, [...(replies.get(c.reply) ?? []), c]);
  const threadsOf = new Map();
  for (const r of roots) threadsOf.set(r.review, [...(threadsOf.get(r.review) ?? []), r]);
  const events = [
    ...pr.comments.map((c) => ({ at: c.createdAt, kind: "comment", c })),
    ...pr.restReviews.filter((r) => r.state !== "PENDING" && ((r.body && r.body.trim()) || r.state !== "COMMENTED" || threadsOf.has(r.id)))
      .map((r) => ({ at: r.submitted_at, kind: "review", r })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const hidden = v.expanded.has("earlier") ? 0 : Math.max(0, events.length - 8);
  return v_flex().id("timeline")
    .child(sectionTitle(t, `Activity · ${events.length}`))
    .when(events.length === 0, (el) => el.child(div().px(16).text_size(14).text_color(t.dim).child("No comments or reviews yet.")))
    .when(hidden > 0, (el) => el.child(h_flex().id("earlier").mx(12).mb(10).h(40).rounded(10).bg(t.surface).items_center().justify_center()
      .on_click((_e, cx) => v.toggle("earlier", cx))
      .child(div().text_size(13).text_color(t.accent).child(`Show ${hidden} earlier`))))
    .children(events.slice(hidden).map((e) => {
      if (e.kind === "comment") return comment(v, t, { id: e.c.id ?? e.at, user: e.c.author?.login, at: e.at, body: e.c.body });
      const look = reviewLook(t, e.r.state);
      const threads = (threadsOf.get(e.r.id) ?? []).map((root) => thread(v, t, root, replies.get(root.id) ?? []));
      return comment(v, t, {
        id: `r${e.r.id}`, user: e.r.user, at: e.at, body: e.r.body, accent: e.r.state === "COMMENTED" ? null : look.color,
        badge: chip(t, look.verb, look.color, { icon: look.icon }),
        children: threads.length ? [v_flex().id("threads").pt(e.r.body && e.r.body.trim() ? 0 : 12).children(threads)] : null,
      });
    }));
}

const MERGE_STATE = {
  CLEAN: ["Ready to merge", "checkmark-circle", "done"],
  HAS_HOOKS: ["Ready to merge", "checkmark-circle", "done"],
  UNSTABLE: ["Some checks are failing", "warning", "working"],
  BLOCKED: ["Merging is blocked", "lock-closed", "blocked"],
  BEHIND: ["Branch is out of date", "git-compare", "working"],
  DIRTY: ["Has conflicts that must be resolved", "alert-circle", "blocked"],
  DRAFT: ["Draft: not ready to merge", "document-outline", "muted"],
  UNKNOWN: ["Checking whether it can merge…", "time-outline", "muted"],
};

function mergeCard(v, t, pr) {
  if (pr.state !== "OPEN") return null;
  const row = (id, ic, color, text, right) => h_flex().id(id).min_h(46).px(14).py(8).gap(12).items_center().border_t(1).border_color(t.border)
    .child(icon(ic).size(20).text_color(color))
    .child(div().flex_1().text_size(14).text_color(t.foreground).child(text))
    .when(Boolean(right), (el) => el.child(right));
  const review = {
    APPROVED: ["checkmark-circle", t.done, "Approved"],
    CHANGES_REQUESTED: ["close-circle", t.blocked, "Changes requested"],
    REVIEW_REQUIRED: ["eye-outline", t.working, "Review required"],
  }[pr.reviewDecision] ?? ["eye-outline", t.muted, "No review required"];
  const waiting = pr.reviewRequests.map((r) => r.login ?? r.name ?? r.slug).filter(Boolean);
  const ms = MERGE_STATE[pr.isDraft ? "DRAFT" : pr.mergeStateStatus] ?? MERGE_STATE.UNKNOWN;
  const target = { repo: pr.repo, number: pr.number };
  return card(t).id("merge").mt(12)
    .child(div().px(14).pt(12).pb(10).text_size(13).font_bold().text_color(t.muted).child("MERGE"))
    .child(row("review", review[0], review[1], review[2]))
    .when(waiting.length > 0, (el) => el.child(row("waiting", "people-outline", t.muted, `Waiting on ${waiting.map((w) => `@${w}`).join(", ")}`)))
    .child(row("state", ms[1], t[ms[2]], ms[0], pr.mergeStateStatus === "BEHIND"
      ? button(t, "update", "Update", { busy: v.busy === "update", action: (_e, cx) => v.act(cx, "update", () => api.prUpdateBranch(target), "Branch updated") })
      : null))
    .when(Boolean(pr.autoMergeRequest), (el) => el.child(row("auto", "flash", t.done, `Auto-merge on (${(pr.autoMergeRequest.mergeMethod ?? "").toLowerCase()})`,
      button(t, "noauto", "Turn off", { busy: v.busy === "noauto", action: (_e, cx) => v.act(cx, "noauto", () => api.prDisableAuto(target), "Auto-merge turned off") }))));
}

export const prPage = {
  init(v, p, cx) {
    v.repo = p.pr.repo;
    loader(v, () => api.loadPr(p.pr));
    v.reload(cx);
  },
  render(v, t) {
    const pr = v.data;
    if (!pr) return placeholder(t, v.error, (_e, cx) => v.reload(cx));
    const st = prState(t, pr);
    const target = { repo: pr.repo, number: pr.number };
    const mine = api.me() && pr.author?.login === api.me();
    const branches = h_flex().flex_wrap().gap(6).items_center()
      .child(chip(t, pr.baseRefName, t.accent))
      .child(icon("arrow-back").size(14).text_color(t.dim))
      .child(h_flex().id("head-branch").on_click(() => copy(pr.headRefName, "Branch name")).child(chip(t, pr.headRefName, t.accent)));
    const stats = h_flex().id("stats").mx(12).mt(4).px(14).min_h(48).gap(12).items_center().rounded(12).bg(t.surface).border(1).border_color(t.border)
      .on_click(() => open({ files: target, title: pr.title }, "Files changed"))
      .child(icon("document-text-outline").size(18).text_color(t.muted))
      .child(div().text_size(14).font_semibold().text_color(t.foreground).child(`${pr.changedFiles} file${pr.changedFiles === 1 ? "" : "s"}`))
      .child(div().text_size(14).font_mono().text_color(t.done).child(`+${pr.additions}`))
      .child(div().text_size(14).font_mono().text_color(t.blocked).child(`−${pr.deletions}`))
      .child(div().flex_1().text_size(13).text_color(t.dim).child(`${pr.commits} commit${pr.commits === 1 ? "" : "s"}`))
      .child(icon("chevron-forward").size(16).text_color(t.dim));
    const body = v_flex()
      .child(titleBlock(v, t, {
        where: `${pr.repo} #${pr.number}`,
        title: pr.title,
        chips: [
          stateChip(t, st),
          h_flex().id("author").gap(6).items_center().child(avatar(t, pr.author?.login, 22))
            .child(div().text_size(13).font_semibold().text_color(t.foreground).child(pr.author?.login ?? "")),
          div().text_size(13).text_color(t.dim).child(pr.mergedAt ? `merged ${ago(pr.mergedAt)} ago` : pr.closedAt ? `closed ${ago(pr.closedAt)} ago` : `opened ${ago(pr.createdAt)} ago`),
        ],
        meta: branches,
      }))
      .child(checksCard(v, t, pr))
      .child(stats)
      .child(mergeCard(v, t, pr))
      .when(pr.labels.length > 0, (el) => el.child(h_flex().id("labels").px(16).pt(12).flex_wrap().gap(6).children(pr.labels.map((l) => label(t, l).id(l.name)))))
      .child(sectionTitle(t, "Description"))
      .child(comment(v, t, { id: "body", user: pr.author?.login, at: pr.createdAt, body: pr.body?.trim() ? pr.body : "_No description._" }))
      .child(timeline(v, t, pr));
    const compose = (mode) => () => sheet({ sheet: "compose", kind: "pr", mode, target, title: pr.title });
    const more = button(t, "more", null, { icon: "ellipsis-horizontal", action: () => sheet({ sheet: "more", kind: "pr", target, pr: slim(pr), ...doneThread(v) }) });
    let bar;
    if (pr.state !== "OPEN") bar = [button(t, "comment", "Comment", { icon: "chatbubble-outline", flex: true, action: compose("comment") }), more];
    else if (pr.isDraft) bar = [
      button(t, "comment", "Comment", { icon: "chatbubble-outline", flex: true, action: compose("comment") }),
      button(t, "ready", "Ready", { icon: "eye-outline", flex: true, primary: true, busy: v.busy === "ready", action: (_e, cx) => v.act(cx, "ready", () => api.prReady(target), "Marked ready for review") }),
      more,
    ];
    else bar = [
      button(t, "comment", null, { icon: "chatbubble-outline", action: compose("comment") }),
      ...(mine ? [] : [button(t, "review", "Review", { icon: "eye-outline", flex: true, action: compose("review") })]),
      button(t, "merge", "Merge", { icon: "git-merge", flex: true, color: pr.mergeStateStatus === "DIRTY" ? t.raised : t.done, fg: pr.mergeStateStatus === "DIRTY" ? t.muted : "#ffffff",
        action: () => sheet({ sheet: "merge", target, pr: slim(pr) }) }),
      more,
    ];
    return page(v, t, body, bar);
  },
};

// What sheets need of a PR (props must stay small).
const slim = (pr) => ({
  title: pr.title, url: pr.url, state: pr.state, isDraft: pr.isDraft, headRefName: pr.headRefName, baseRefName: pr.baseRefName,
  mergeStateStatus: pr.mergeStateStatus, author: pr.author?.login, auto: Boolean(pr.autoMergeRequest),
  failedRuns: [...new Set((pr.statusCheckRollup ?? []).map(normCheck).filter((c) => c.state === "fail" && c.run).map((c) => c.run))],
});

// ---- Files changed ----

const FILE_STATUS = { added: ["add-circle", "done"], removed: ["remove-circle", "blocked"], renamed: ["arrow-forward-circle", "accent"], modified: ["ellipse", "working"], changed: ["ellipse", "working"], copied: ["copy", "accent"] };
const DIFF_LIMIT = 400;

function diff(v, t, f, key) {
  if (!f.patch) return div().px(14).py(12).text_size(13).text_color(t.dim).child("Binary file, or too large to show here.");
  const lines = f.patch.split("\n");
  const all = v.expanded.has(`${key}.all`);
  const shown = all ? lines : lines.slice(0, DIFF_LIMIT);
  let a = 0;
  let b = 0;
  const rows = shown.map((l, i) => {
    const h = l.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)/);
    if (h) {
      a = Number(h[1]);
      b = Number(h[2]);
      return h_flex().id(i).bg(t.ansi4 + "1a").child(div().whitespace_nowrap().px(8).py(3).font_mono().text_size(11).text_color(t.ansi6).child(l));
    }
    const kind = l[0];
    const old = kind === "+" ? "" : String(a++);
    const neu = kind === "-" ? "" : String(b++);
    if (kind === "+") a--;
    if (kind === "-") b--;
    if (kind === "\\") return h_flex().id(i).child(div().px(8).font_mono().text_size(11).text_color(t.dim).child(l));
    const bg = kind === "+" ? t.done + "22" : kind === "-" ? t.blocked + "22" : null;
    return h_flex().id(i).when(Boolean(bg), (el) => el.bg(bg))
      .child(div().w(36).pr(4).text_right().font_mono().text_size(10).line_height(17).text_color(t.dim).child(old))
      .child(div().w(36).pr(6).text_right().font_mono().text_size(10).line_height(17).text_color(t.dim).child(neu))
      .child(div().w(12).font_mono().text_size(12).line_height(17).text_color(kind === "+" ? t.done : kind === "-" ? t.blocked : t.dim).child(kind === " " ? "" : kind))
      .child(div().whitespace_nowrap().pr(12).font_mono().text_size(12).line_height(17).text_color(t.foreground).child(l.slice(1) || " "));
  });
  return v_flex()
    .child(div().overflow_x_scroll().child(v_flex().py(4).children(rows)))
    .when(lines.length > shown.length, (el) => el.child(div().id("more").px(14).py(10).bg(t.raised).on_click((_e, cx) => v.toggle(`${key}.all`, cx))
      .child(div().text_size(13).text_color(t.accent).child(`Show ${lines.length - shown.length} more lines`))));
}

export const filesPage = {
  init(v, p, cx) {
    v.repo = p.files.repo;
    loader(v, () => api.loadFiles(p.files));
    v.reload(cx);
  },
  render(v, t) {
    const files = v.data;
    if (!files) return placeholder(t, v.error, (_e, cx) => v.reload(cx));
    const p = props();
    const total = files.reduce((n, f) => n + (f.patch ? f.patch.split("\n").length : 0), 0);
    // Small changes open; big ones start folded.
    const folded = (key) => (total > 600 ? !v.expanded.has(key) : v.expanded.has(key));
    const body = v_flex()
      .child(v_flex().id("head").px(16).pt(14).pb(8).gap(4)
        .child(div().text_size(13).font_mono().text_color(t.muted).child(`${p.files.repo} #${p.files.number}`))
        .child(div().text_size(17).font_bold().text_color(t.foreground).child(p.title ?? "Files changed"))
        .child(h_flex().gap(10)
          .child(div().text_size(13).text_color(t.muted).child(`${files.length} files`))
          .child(div().text_size(13).font_mono().text_color(t.done).child(`+${files.reduce((n, f) => n + f.additions, 0)}`))
          .child(div().text_size(13).font_mono().text_color(t.blocked).child(`−${files.reduce((n, f) => n + f.deletions, 0)}`))))
      .children(files.map((f, i) => {
        const key = `f${i}`;
        const shut = folded(key);
        const st = FILE_STATUS[f.status] ?? FILE_STATUS.modified;
        const name = f.filename.split("/");
        return card(t).id(f.filename).mb(10)
          .child(h_flex().id("h").min_h(48).px(12).py(8).gap(10).items_center().bg(t.raised)
            .on_click((_e, cx) => v.toggle(key, cx))
            .on_long_press(() => copy(f.filename, "Path"))
            .child(icon(shut ? "chevron-forward" : "chevron-down").size(16).text_color(t.muted))
            .child(icon(st[0]).size(14).text_color(t[st[1]]))
            .child(v_flex().flex_1().min_w(0)
              .child(div().truncate().font_mono().text_size(13).font_semibold().text_color(t.foreground).child(name.pop()))
              .when(name.length > 0 || Boolean(f.previous_filename), (el) => el.child(div().truncate().font_mono().text_size(11).text_color(t.dim)
                .child(f.previous_filename ? `from ${f.previous_filename}` : name.join("/")))))
            .child(div().font_mono().text_size(12).text_color(t.done).child(`+${f.additions}`))
            .child(div().font_mono().text_size(12).text_color(t.blocked).child(`−${f.deletions}`)))
          .when(!shut, (el) => el.child(diff(v, t, f, key)));
      }));
    return page(v, t, body, null);
  },
};

// ---- Issue ----

export const issuePage = {
  init(v, p, cx) {
    v.repo = p.issue.repo;
    loader(v, () => api.loadIssue(p.issue));
    v.reload(cx);
  },
  render(v, t) {
    const is = v.data;
    if (!is) return placeholder(t, v.error, (_e, cx) => v.reload(cx));
    const target = { repo: is.repo, number: is.number };
    const body = v_flex()
      .child(titleBlock(v, t, {
        where: `${is.repo} #${is.number}`,
        title: is.title,
        chips: [
          stateChip(t, issueState(t, is)),
          h_flex().id("author").gap(6).items_center().child(avatar(t, is.author?.login, 22))
            .child(div().text_size(13).font_semibold().text_color(t.foreground).child(is.author?.login ?? "")),
          div().text_size(13).text_color(t.dim).child(is.closedAt ? `closed ${ago(is.closedAt)} ago` : `opened ${ago(is.createdAt)} ago`),
        ],
        meta: is.labels.length || is.assignees.length || is.milestone
          ? h_flex().flex_wrap().gap(6).items_center()
            .children(is.labels.map((l) => label(t, l).id(l.name)))
            .children(is.assignees.map((a) => chip(t, `@${a.login}`, t.muted, { icon: "person-outline" }).id(a.login)))
            .when(Boolean(is.milestone), (el) => el.child(chip(t, is.milestone.title, t.muted, { icon: "flag-outline" })))
          : null,
      }))
      .child(sectionTitle(t, "Description"))
      .child(comment(v, t, { id: "body", user: is.author?.login, at: is.createdAt, body: is.body?.trim() ? is.body : "_No description._" }))
      .child(sectionTitle(t, `Comments · ${is.comments.length}`))
      .children(is.comments.map((c, i) => comment(v, t, { id: c.id ?? i, user: c.author?.login, at: c.createdAt, body: c.body })));
    const open = is.state === "OPEN";
    const bar = [
      button(t, "comment", "Comment", { icon: "chatbubble-outline", flex: true, action: () => sheet({ sheet: "compose", kind: "issue", mode: "comment", target, title: is.title }) }),
      open
        ? button(t, "close", "Close", { icon: "checkmark-circle-outline", flex: true, action: () => sheet({ sheet: "closeIssue", target, title: is.title }) })
        : button(t, "reopen", "Reopen", { icon: "refresh", flex: true, busy: v.busy === "reopen", action: (_e, cx) => v.act(cx, "reopen", () => api.issueReopen(target), "Issue reopened") }),
      button(t, "more", null, { icon: "ellipsis-horizontal", action: () => sheet({ sheet: "more", kind: "issue", target, issue: { title: is.title, url: is.url, state: is.state }, ...doneThread(v) }) }),
    ];
    return page(v, t, body, bar);
  },
};

/** A #123 link: a PR or an issue, found out first. */
export const refPage = {
  init(v, p, cx) {
    v.repo = p.ref.repo;
    v.resolved = null;
    v.reload = (cx) => {
      v.loading = true;
      cx.notify();
      cx.spawn(async (cx) => {
        try {
          const kind = await api.resolveRef(p.ref);
          v.resolved = kind === "pr" ? prPage : issuePage;
          v.loading = false;
          v.resolved.init(v, { [kind]: p.ref }, cx);
        } catch (e) {
          v.loading = false;
          v.error = api.errorText(e);
          cx.notify();
        }
      });
    };
    v.reload(cx);
  },
  render(v, t, cx) {
    if (v.resolved) return v.resolved.render(v, t, cx);
    return placeholder(t, v.error, (_e, cx) => v.reload(cx));
  },
};

// ---- Release ----

export const releasePage = {
  init(v, p, cx) {
    v.repo = p.release.repo;
    loader(v, () => api.loadRelease(p.release));
    v.reload(cx);
  },
  render(v, t) {
    const r = v.data;
    if (!r) return placeholder(t, v.error, (_e, cx) => v.reload(cx));
    const kind = r.draft ? ["Draft", t.muted] : r.prerelease ? ["Pre-release", t.working] : r.latest ? ["Latest", t.done] : null;
    const body = v_flex()
      .child(titleBlock(v, t, {
        where: r.repo,
        title: r.name || r.tag_name,
        chips: [
          chip(t, r.tag_name, t.accent, { icon: "pricetag-outline" }),
          kind ? chip(t, kind[0], kind[1], { solid: true }) : null,
          h_flex().id("author").gap(6).items_center().child(avatar(t, r.author, 22))
            .child(div().text_size(13).font_semibold().text_color(t.foreground).child(r.author ?? "")),
          div().text_size(13).text_color(t.dim).child(`released ${ago(r.published_at ?? r.created_at)} ago`),
        ],
      }))
      .child(card(t).id("notes").mt(6).child(div().px(14).py(14).child(md(v, t, r.body?.trim() ? r.body : "_No release notes._", "rel"))))
      .when(r.assets.length > 0, (el) => el
        .child(sectionTitle(t, `Assets · ${r.assets.length}`))
        .child(card(t).id("assets").children(r.assets.map((a, i) => h_flex().id(a.name).min_h(48).px(14).py(8).gap(12).items_center()
          .when(i > 0, (e) => e.border_t(1).border_color(t.border))
          .child(icon("cube-outline").size(18).text_color(t.muted))
          .child(div().flex_1().truncate().font_mono().text_size(13).text_color(t.foreground).child(a.name))
          .child(v_flex().items_end()
            .child(div().text_size(12).text_color(t.muted).child(bytes(a.size)))
            .child(div().text_size(11).text_color(t.dim).child(`${a.download_count} downloads`)))))));
    const bar = [
      button(t, "link", "Copy link", { icon: "link-outline", flex: true, action: () => copy(r.html_url, "Link") }),
      button(t, "tag", "Copy tag", { icon: "pricetag-outline", flex: true, action: () => copy(r.tag_name, "Tag") }),
      ...(props().thread ? [button(t, "done", null, { icon: "checkmark-done-outline", action: () => { api.markDone([props().thread]); run("screen.back"); } })] : []),
    ];
    return page(v, t, body, bar);
  },
};

// ---- Workflow runs (a CI notification) ----

function runRow(t, r, repo) {
  const st = runState(r);
  return h_flex().id(r.databaseId).min_h(60).px(14).py(10).gap(12).items_center().border_t(1).border_color(t.border)
    .on_click(() => open({ run: { repo, id: r.databaseId } }, `Run #${r.number}`))
    .child(checkIcon(t, st, 22))
    .child(v_flex().flex_1().min_w(0).gap(2)
      .child(div().line_clamp(2).text_size(14).text_color(t.foreground).child(r.displayTitle))
      .child(div().truncate().text_size(12).text_color(t.dim)
        .child([`${r.workflowName} #${r.number}`, r.attempt > 1 ? `attempt ${r.attempt}` : null, r.event, `${ago(r.createdAt)} ago`].filter(Boolean).join(" · "))))
    .child(icon("chevron-forward").size(16).text_color(t.dim));
}

export const ciPage = {
  init(v, p, cx) {
    v.repo = p.ci.repo;
    loader(v, async () => {
      const [runs, pr] = await Promise.all([api.loadRuns(p.ci), p.ci.branch ? api.prForBranch(p.ci.repo, p.ci.branch).catch(() => null) : null]);
      return { runs, pr };
    });
    v.reload(cx);
  },
  render(v, t) {
    const d = v.data;
    if (!d) return placeholder(t, v.error, (_e, cx) => v.reload(cx));
    const c = props().ci;
    const n = props().thread;
    const body = v_flex()
      .child(titleBlock(v, t, {
        where: c.repo,
        title: n ? n.title : c.workflow ?? "Workflow runs",
        chips: [
          c.workflow ? chip(t, c.workflow, t.muted, { icon: "git-network-outline" }) : null,
          c.branch ? chip(t, c.branch, t.accent, { icon: "git-branch-outline" }) : null,
        ],
      }))
      .when(Boolean(d.pr), (el) => el.child(h_flex().id("pr").mx(12).mt(4).px(14).min_h(48).gap(12).items_center().rounded(12).bg(t.surface).border(1).border_color(t.border)
        .on_click(() => open({ pr: { repo: c.repo, number: d.pr } }, `#${d.pr}`))
        .child(icon("git-pull-request").size(18).text_color(t.done))
        .child(div().flex_1().text_size(14).font_semibold().text_color(t.foreground).child(`Pull request #${d.pr}`))
        .child(icon("chevron-forward").size(16).text_color(t.dim))))
      .child(sectionTitle(t, "Recent runs"))
      .child(card(t).id("runs").when(d.runs.length === 0, (el) => el.child(div().p(14).text_size(14).text_color(t.dim).child("No runs found.")))
        .children(d.runs.map((r) => runRow(t, r, c.repo))));
    const bar = n ? [button(t, "done", "Done", { icon: "checkmark-done-outline", flex: true, action: () => { api.markDone([n]); run("screen.back"); } })] : null;
    return page(v, t, body, bar);
  },
};

// ---- One run ----

export const runPage = {
  init(v, p, cx) {
    v.repo = p.run.repo;
    loader(v, async () => {
      const r = await api.loadRun(p.run);
      const pr = r.event === "pull_request" ? await api.prForBranch(r.repo, r.headBranch).catch(() => null) : null;
      return { ...r, pr };
    });
    v.reload(cx);
  },
  render(v, t) {
    const r = v.data;
    if (!r) return placeholder(t, v.error, (_e, cx) => v.reload(cx));
    const st = runState(r);
    const look = checkLook(t, st);
    const id = { repo: r.repo, run: r.databaseId };
    const failedJobs = r.jobs.some((j) => runState(j) === "fail");
    const body = v_flex()
      .child(titleBlock(v, t, {
        where: `${r.repo} · ${r.workflowName} #${r.number}`,
        title: r.displayTitle,
        chips: [
          h_flex().id("st").gap(6).items_center().child(checkIcon(t, st, 18))
            .child(div().text_size(13).font_semibold().text_color(look.color).child(r.status === "completed" ? r.conclusion : r.status)),
          chip(t, r.headBranch, t.accent, { icon: "git-branch-outline" }),
          div().text_size(13).font_mono().text_color(t.dim).child((r.headSha ?? "").slice(0, 7)),
          div().text_size(13).text_color(t.dim).child(`${r.event} · ${ago(r.createdAt)} ago${r.status === "completed" ? ` · ${duration(r.createdAt, r.updatedAt)}` : ""}${r.attempt > 1 ? ` · attempt ${r.attempt}` : ""}`),
        ],
      }))
      .when(Boolean(r.pr), (el) => el.child(h_flex().id("pr").mx(12).mt(4).px(14).min_h(48).gap(12).items_center().rounded(12).bg(t.surface).border(1).border_color(t.border)
        .on_click(() => open({ pr: { repo: r.repo, number: r.pr } }, `#${r.pr}`))
        .child(icon("git-pull-request").size(18).text_color(t.done))
        .child(div().flex_1().text_size(14).font_semibold().text_color(t.foreground).child(`Pull request #${r.pr}`))
        .child(icon("chevron-forward").size(16).text_color(t.dim))))
      .child(sectionTitle(t, `Jobs · ${r.jobs.length}`))
      .child(card(t).id("jobs").children(r.jobs.map((j, i) => {
        const js = runState(j);
        const bad = (j.steps ?? []).filter((s) => runState(s) === "fail");
        return v_flex().id(j.databaseId).when(i > 0, (e) => e.border_t(1).border_color(t.border))
          .on_click(() => open({ log: { repo: r.repo, run: r.databaseId, job: j.databaseId, name: j.name, failed: js === "fail" } }, j.name))
          .child(h_flex().min_h(52).px(14).py(8).gap(12).items_center()
            .child(checkIcon(t, js, 18))
            .child(div().flex_1().line_clamp(2).text_size(14).text_color(t.foreground).child(j.name))
            .child(div().text_size(12).text_color(t.dim).child(js === "pending" ? "" : duration(j.startedAt, j.completedAt)))
            .child(icon("chevron-forward").size(16).text_color(t.dim)))
          .children(bad.map((s) => h_flex().id(s.number).pl(44).pr(14).pb(8).gap(8).items_center()
            .child(icon("close").size(14).text_color(t.blocked))
            .child(div().flex_1().truncate().text_size(13).text_color(t.blocked).child(s.name))));
      })));
    const bar = r.status !== "completed"
      ? [button(t, "cancel", "Cancel run", { icon: "stop-circle-outline", flex: true, busy: v.busy === "cancel", action: (_e, cx) => v.act(cx, "cancel", () => api.cancelRun(id), "Run cancelled") })]
      : [
        ...(failedJobs ? [button(t, "failed", "Re-run failed", { icon: "refresh", flex: true, primary: true, busy: v.busy === "failed", action: (_e, cx) => v.act(cx, "failed", () => api.rerun(id, true), "Re-running failed jobs") })] : []),
        button(t, "all", "Re-run all", { icon: "reload", flex: true, busy: v.busy === "all", action: (_e, cx) => v.act(cx, "all", () => api.rerun(id, false), "Re-running all jobs") }),
      ];
    bar.push(button(t, "link", null, { icon: "link-outline", action: () => copy(r.url, "Link") }));
    return page(v, t, body, bar);
  },
};

// ---- A job's log ----

const LOG_LIMIT = 800;

function parseLog(out) {
  const steps = [];
  for (const raw of out.split("\n")) {
    if (!raw) continue;
    const cols = raw.split("\t");
    const step = cols.length >= 3 ? cols[1] : "";
    let text = (cols.length >= 3 ? cols.slice(2).join("\t") : raw)
      .replace(/^\uFEFF?\d{4}-\d\d-\d\dT[\d:.]+Z ?/, "")
      .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
    let kind = null;
    const m = text.match(/^##\[(\w+)\](.*)$/);
    if (m) {
      kind = m[1];
      text = m[2];
    }
    if (kind === "endgroup") continue;
    if (!steps.length || steps[steps.length - 1].name !== step) steps.push({ name: step, lines: [] });
    steps[steps.length - 1].lines.push({ text, kind });
  }
  return steps;
}

export const logPage = {
  init(v, p, cx) {
    v.repo = p.log.repo;
    loader(v, async () => {
      const out = await api.loadLog({ repo: p.log.repo, run: p.log.run, job: p.log.job, failedOnly: p.log.failed });
      return { out, steps: parseLog(out) };
    });
    v.reload(cx);
  },
  render(v, t) {
    const d = v.data;
    if (!d) return placeholder(t, v.error, (_e, cx) => v.reload(cx));
    const p = props().log;
    const total = d.steps.reduce((n, s) => n + s.lines.length, 0);
    const all = v.expanded.has("all");
    // The end of a log is where it failed: drop the start when it's long.
    let skip = all ? 0 : Math.max(0, total - LOG_LIMIT);
    const blocks = [];
    for (const [si, s] of d.steps.entries()) {
      const lines = s.lines.slice(Math.min(skip, s.lines.length));
      skip = Math.max(0, skip - s.lines.length);
      if (!lines.length) continue;
      blocks.push(div().id(`s${si}`).px(12).pt(12).pb(4).text_size(12).font_bold().text_color(t.accent).child(s.name || "Log"));
      blocks.push(...lines.map((l, i) => div().id(`${si}.${i}`).px(12).whitespace_nowrap().font_mono().text_size(11).line_height(16)
        .text_color(l.kind === "error" ? t.blocked : l.kind === "warning" ? t.working : l.kind === "group" ? t.ansi6 : l.kind ? t.muted : t.foreground)
        .when(l.kind === "error", (e) => e.bg(t.blocked + "1a"))
        .child(l.kind === "group" ? `▸ ${l.text}` : l.text || " ")));
    }
    const body = v_flex()
      .child(v_flex().id("head").px(16).pt(14).pb(6).gap(4)
        .child(div().text_size(13).font_mono().text_color(t.muted).child(p.repo))
        .child(div().text_size(17).font_bold().text_color(t.foreground).child(p.name))
        .child(h_flex().gap(8).items_center()
          .child(div().text_size(12).text_color(t.dim).child(p.failed ? "Failed steps" : "Full log"))
          .when(total > LOG_LIMIT && !all, (el) => el.child(div().id("all").on_click((_e, cx) => v.toggle("all", cx))
            .child(div().text_size(12).text_color(t.accent).child(`Last ${LOG_LIMIT} of ${total} lines · show all`))))))
      .child(div().id("log").mx(8).rounded(8).bg(t.canvas).border(1).border_color(t.border).overflow_x_scroll().child(v_flex().pb(12).children(blocks)));
    const bar = [
      button(t, "copy", "Copy log", { icon: "copy-outline", flex: true, action: () => copy(d.out, "Log") }),
      button(t, "rerun", "Re-run job", { icon: "refresh", flex: true, busy: v.busy === "rerun", action: (_e, cx) => v.act(cx, "rerun", () => api.gh(["run", "rerun", "-R", p.repo, "--job", String(p.job)]), "Re-running the job") }),
    ];
    return page(v, t, body, bar);
  },
};
