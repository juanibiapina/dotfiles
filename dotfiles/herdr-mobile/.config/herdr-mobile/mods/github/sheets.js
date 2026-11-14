// Sheets over a page: write a comment or review, merge, more actions, a
// check, close an issue, send it to a session.

import { div, h_flex, v_flex, input, icon } from "herdr-ui";
import { run, notify, props, closeOverlay, openOverlay } from "herdr";
import * as api from "./api.js";
import * as sessions from "./sessions.js";
import { targets, filter, describe, presets, labelKey } from "./routing.js";
import { open } from "./inbox.js";
import { button, sheetRow, spinner, checkIcon, duration, ago } from "./ui.js";

const close = () => closeOverlay(props().overlay);
const copy = (text, what) => run("clipboard.copy", { text }).then(() => notify({ title: `${what} copied` }));

/** Runs f; on success closes the sheet, toasts, and reloads the pages. */
function submit(v, cx, f, ok) {
  if (v.busy) return;
  v.busy = true;
  v.error = null;
  cx.notify();
  cx.spawn(async (cx) => {
    try {
      await f();
      close();
      notify({ title: ok, level: "success" });
      api.bump();
    } catch (e) {
      v.error = api.errorText(e);
    }
    v.busy = false;
    cx.notify();
  });
}

const errorLine = (t, v) => (v.error ? div().id("err").text_size(13).text_color(t.blocked).child(v.error) : null);

/** A row that closes the sheet and does something. */
const act = (t, id, title, f, opts = {}) => sheetRow(t, id, title, {
  ...opts,
  action: () => {
    close();
    Promise.resolve(f()).catch(api.failed);
  },
});

/** An action that changes GitHub: toast, then reload the pages. */
const change = (f, ok) => () => f().then(() => {
  notify({ title: ok, level: "success" });
  api.bump();
});

const head = (t, over, title) => v_flex().id("head").px(14).pb(10).gap(4)
  .when(Boolean(over), (el) => el.child(div().text_size(12).text_color(t.muted).child(over)))
  .child(div().line_clamp(2).text_size(17).font_bold().text_color(t.foreground).child(title));

// ---- Comment or review ----

const EVENTS = [["comment", "Comment", "chatbubble-outline", "muted"], ["approve", "Approve", "checkmark-circle", "done"], ["request-changes", "Request changes", "close-circle", "blocked"]];

export const compose = {
  init(v) {
    v.text = "";
    v.event = "comment";
  },
  render(v, t) {
    const p = props();
    const where = `${p.target.repo} #${p.target.number}`;
    const review = p.mode === "review";
    const needsBody = !review || v.event !== "approve";
    const send = (_e, cx) => {
      const body = v.text.trim();
      if (needsBody && !body) {
        v.error = "Write something first.";
        return cx.notify();
      }
      if (review) submit(v, cx, () => api.prReview(p.target, v.event, body), v.event === "approve" ? "Approved" : v.event === "request-changes" ? "Changes requested" : "Review sent");
      else submit(v, cx, () => (p.kind === "pr" ? api.prComment(p.target, body) : api.issueComment(p.target, body)), "Comment posted");
    };
    const label = review ? EVENTS.find((e) => e[0] === v.event)[1] : "Comment";
    return v_flex().w_full().px(16).pb(8).gap(12)
      .child(h_flex().gap(10).items_center()
        .child(v_flex().flex_1().min_w(0)
          .child(div().text_size(12).text_color(t.muted).child(where))
          .child(div().truncate().text_size(16).font_bold().text_color(t.foreground).child(review ? "Review" : "Comment")))
        .child(button(t, "send", label, { primary: true, busy: v.busy, action: send })))
      .child(input("body").autofocus().multiline().placeholder(review ? "Leave a review (Markdown)" : "Write a comment (Markdown)")
        .h(130).px(12).py(10).rounded(10).border(1).border_color(t.input).bg(t.background).text_size(15).text_color(t.foreground)
        .on_change((e) => { v.text = e.text; }))
      .when(review, (el) => el.child(h_flex().gap(8).children(EVENTS.map(([id, text, ic, color]) => h_flex().id(id).flex_1().h(40).gap(4).px(6).rounded(10).items_center().justify_center()
        .bg(v.event === id ? t[color] + "33" : t.raised).border(1).border_color(v.event === id ? t[color] : t.raised)
        .on_click((_e, cx) => { v.event = id; cx.notify(); })
        .child(icon(ic).size(16).text_color(t[color]))
        .child(div().text_size(12).font_semibold().text_color(t.foreground).child(id === "request-changes" ? "Changes" : text))))))
      .child(errorLine(t, v));
  },
};

// ---- Merge ----

const METHODS = [["squash", "Squash and merge", "squashMergeAllowed", "One commit on the base branch"], ["merge", "Create a merge commit", "mergeCommitAllowed", "Every commit, plus a merge commit"], ["rebase", "Rebase and merge", "rebaseMergeAllowed", "Every commit, rebased onto the base"]];

export const merge = {
  init(v, cx) {
    const p = props();
    v.repoInfo = null;
    v.deleteBranch = true;
    // Clean: merge now. Otherwise GitHub merges once it's allowed.
    v.auto = !["CLEAN", "HAS_HOOKS", "UNSTABLE"].includes(p.pr.mergeStateStatus);
    cx.spawn(async (cx) => {
      try {
        v.repoInfo = await api.loadRepoMerge(p.target.repo);
        const allowed = METHODS.filter((m) => v.repoInfo[m[2]]);
        const pref = (v.repoInfo.viewerDefaultMergeMethod ?? "").toLowerCase();
        v.method = (allowed.find((m) => m[0] === pref) ?? allowed[0] ?? METHODS[0])[0];
      } catch (e) {
        v.error = api.errorText(e);
        v.method = "squash";
      }
      cx.notify();
    });
  },
  render(v, t) {
    const p = props();
    const pr = p.pr;
    const toggle = (id, title, detail, on, f) => h_flex().id(id).min_h(52).px(14).py(8).gap(12).items_center().rounded(10)
      .on_click((_e, cx) => { f(); cx.notify(); })
      .child(icon(on ? "checkbox" : "square-outline").size(22).text_color(on ? t.accent : t.muted))
      .child(v_flex().flex_1()
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child(title))
        .child(div().text_size(12).text_color(t.muted).child(detail)));
    const methods = v.repoInfo ? METHODS.filter((m) => v.repoInfo[m[2]]) : null;
    const go = METHODS.find((m) => m[0] === v.method)?.[1] ?? "Merge";
    return v_flex().w_full().px(4).pb(8).gap(4)
      .child(head(t, `${p.target.repo} #${p.target.number} · ${pr.headRefName} → ${pr.baseRefName}`, pr.title))
      .when(pr.mergeStateStatus === "DIRTY", (el) => el.child(div().px(14).pb(6).text_size(13).text_color(t.blocked).child("This branch has conflicts. Resolve them before merging.")))
      .child(methods === null
        ? h_flex().id("loading").px(14).py(12).child(spinner(t))
        : v_flex().id("methods").children(methods.map(([id, title, _k, detail]) => h_flex().id(id).min_h(52).px(14).py(8).gap(12).items_center().rounded(10)
          .on_click((_e, cx) => { v.method = id; cx.notify(); })
          .child(icon(v.method === id ? "radio-button-on" : "radio-button-off").size(22).text_color(v.method === id ? t.accent : t.muted))
          .child(v_flex().flex_1()
            .child(div().text_size(15).font_semibold().text_color(t.foreground).child(title))
            .child(div().text_size(12).text_color(t.muted).child(detail))))))
      .child(div().h(1).mx(14).bg(t.border))
      .child(toggle("delete", "Delete the branch", pr.headRefName, v.deleteBranch, () => { v.deleteBranch = !v.deleteBranch; }))
      .child(toggle("auto", "Merge when ready", "Auto-merge once checks and reviews allow it", v.auto, () => { v.auto = !v.auto; }))
      .child(v_flex().px(14).pt(8).gap(8)
        .child(errorLine(t, v))
        .child(button(t, "go", v.auto ? "Enable auto-merge" : go, {
          color: t.done, fg: "#ffffff", busy: v.busy, disabled: !methods,
          action: (_e, cx) => submit(v, cx, () => api.prMerge(p.target, v.method, { deleteBranch: v.deleteBranch, auto: v.auto }), v.auto ? "Auto-merge enabled" : "Merged"),
        })));
  },
};

// ---- More ----

export const more = {
  render(_v, t) {
    const p = props();
    const target = p.target;
    const n = p.thread;
    const rows = [];
    if (p.kind === "pr") {
      const pr = p.pr;
      rows.push(act(t, "route", "Send to a session", () => openOverlay({ mod: "github", kind: "sheet", props: { sheet: "route", kind: "pr", target, title: pr.title, url: pr.url, failing: pr.failedRuns.length > 0, reason: n?.reason } }),
        { icon: "sparkles-outline", color: t.accent, detail: "A running agent, or a new one" }));
      rows.push(act(t, "files", "Files changed", () => open({ files: target, title: pr.title }, "Files changed"), { icon: "document-text-outline" }));
      if (pr.state === "OPEN") {
        if (pr.failedRuns.length) rows.push(act(t, "rerun", "Re-run failed jobs", change(() => Promise.all(pr.failedRuns.map((r) => api.rerun({ repo: target.repo, run: r }, true))), "Re-running failed jobs"), { icon: "refresh" }));
        if (pr.mergeStateStatus === "BEHIND") rows.push(act(t, "update", "Update branch", change(() => api.prUpdateBranch(target), "Branch updated"), { icon: "git-compare-outline", detail: `Merge ${pr.baseRefName} into ${pr.headRefName}` }));
        rows.push(pr.isDraft
          ? act(t, "ready", "Ready for review", change(() => api.prReady(target), "Marked ready for review"), { icon: "eye-outline" })
          : act(t, "draft", "Convert to draft", change(() => api.prDraft(target), "Converted to draft"), { icon: "document-outline" }));
        if (pr.auto) rows.push(act(t, "noauto", "Turn off auto-merge", change(() => api.prDisableAuto(target), "Auto-merge turned off"), { icon: "flash-off-outline" }));
      }
      rows.push(act(t, "branch", "Copy branch name", () => copy(pr.headRefName, "Branch name"), { icon: "git-branch-outline", detail: pr.headRefName }));
      rows.push(act(t, "checkout", "Copy checkout command", () => copy(`gh pr checkout ${target.number} -R ${target.repo}`, "Command"), { icon: "terminal-outline" }));
      rows.push(act(t, "link", "Copy link", () => copy(pr.url, "Link"), { icon: "link-outline" }));
      if (pr.state === "OPEN") rows.push(act(t, "close", "Close pull request", change(() => api.prClose(target), "Pull request closed"), { icon: "close-circle-outline", danger: true }));
      if (pr.state === "CLOSED") rows.push(act(t, "reopen", "Reopen pull request", change(() => api.prReopen(target), "Pull request reopened"), { icon: "refresh" }));
    } else {
      const is = p.issue;
      rows.push(act(t, "route", "Send to a session", () => openOverlay({ mod: "github", kind: "sheet", props: { sheet: "route", kind: "issue", target, title: is.title, url: is.url, reason: n?.reason } }),
        { icon: "sparkles-outline", color: t.accent, detail: "A running agent, or a new one" }));
      rows.push(act(t, "link", "Copy link", () => copy(is.url, "Link"), { icon: "link-outline" }));
      if (is.state === "OPEN") rows.push(act(t, "close", "Close issue", () => openOverlay({ mod: "github", kind: "sheet", props: { sheet: "closeIssue", target, title: is.title } }), { icon: "checkmark-circle-outline" }));
      else rows.push(act(t, "reopen", "Reopen issue", change(() => api.issueReopen(target), "Issue reopened"), { icon: "refresh" }));
    }
    if (n) {
      rows.push(act(t, "done", "Done", () => api.markDone([n]).then(() => run("screen.back")), { icon: "checkmark-done-outline", detail: "Remove the notification from the inbox" }));
      rows.push(act(t, "unsub", "Unsubscribe", () => api.unsubscribe(n), { icon: "notifications-off-outline", detail: "No more notifications from this thread", danger: true }));
    }
    return v_flex().w_full().px(4).pb(8)
      .child(head(t, `${target.repo} #${target.number}`, (p.pr ?? p.issue).title))
      .children(rows);
  },
};

// ---- Close an issue ----

export const closeIssue = {
  render(_v, t) {
    const p = props();
    return v_flex().w_full().px(4).pb(8)
      .child(head(t, `${p.target.repo} #${p.target.number}`, p.title))
      .child(act(t, "done", "Close as completed", change(() => api.issueClose(p.target, "completed"), "Issue closed"), { icon: "checkmark-circle", color: t.ansi5, detail: "Done, fixed, or answered" }))
      .child(act(t, "nope", "Close as not planned", change(() => api.issueClose(p.target, "not planned"), "Issue closed"), { icon: "remove-circle-outline", detail: "Won't fix, duplicate, or stale" }));
  },
};

// ---- A check ----

export const check = {
  render(_v, t) {
    const p = props();
    const c = p.check;
    const id = c.run ? { repo: p.repo, run: c.run } : null;
    return v_flex().w_full().px(4).pb(8)
      .child(h_flex().px(14).pb(10).gap(12).items_center()
        .child(checkIcon(t, c.state, 24))
        .child(v_flex().flex_1().min_w(0)
          .child(div().line_clamp(2).text_size(17).font_bold().text_color(t.foreground).child(c.name))
          .child(div().text_size(12).text_color(t.muted).child([c.workflow, c.state === "pending" ? (c.started ? `started ${ago(c.started)} ago` : "queued") : duration(c.started, c.completed)].filter(Boolean).join(" · ")))))
      .when(Boolean(c.job), (el) => el.child(act(t, "log", c.state === "fail" ? "Failed steps' log" : "Log", () => open({ log: { repo: p.repo, run: c.run, job: c.job, name: c.name, failed: c.state === "fail" } }, c.name), { icon: "reader-outline" })))
      .when(Boolean(id), (el) => el.child(act(t, "run", "Open the run", () => open({ run: { repo: p.repo, id: c.run } }, "Run"), { icon: "git-network-outline", detail: "Every job of this workflow run" })))
      .when(Boolean(id) && c.state === "fail", (el) => el.child(act(t, "rerun", "Re-run failed jobs", change(() => api.rerun(id, true), "Re-running failed jobs"), { icon: "refresh" })))
      .when(Boolean(c.job) && c.state !== "pending", (el) => el.child(act(t, "rejob", "Re-run this job", change(() => api.gh(["run", "rerun", "-R", p.repo, "--job", String(c.job)]), "Re-running the job"), { icon: "reload" })))
      .when(Boolean(id) && c.state === "pending", (el) => el.child(act(t, "cancel", "Cancel the run", change(() => api.cancelRun(id), "Run cancelled"), { icon: "stop-circle-outline", danger: true })))
      .when(Boolean(c.url), (el) => el.child(act(t, "link", "Copy link", () => copy(c.url, "Link"), { icon: "link-outline" })));
  },
};

// ---- Send to a session ----

const AGENTS = [["pi", "Pi"], ["claude", "Claude"]];
const SHOWN = 8;

// props: { kind: "pr" | "issue", target: { repo, number }, title, url, failing?, reason? }
export const route = {
  init(v, cx) {
    v.agent = localStorage.getItem("agent") ?? "pi";
    v.query = "";
    v.places = null;
    v.pick = null;
    v.preset = 0;
    v.text = null;
    v.all = false;
    cx.spawn(async (cx) => {
      try { v.places = await sessions.listPlaces(props().target.repo); } catch (_) { v.places = []; }
      cx.notify();
    });
  },
  render(v, t) {
    const p = props();
    const subject = { repo: p.target.repo, number: p.target.number, kind: p.kind, url: p.url, title: p.title, reason: p.reason, failing: p.failing };
    const all = targets(sessions.listSessions(), v.places ?? [], subject);
    const shown = filter(all, v.query, subject);
    const key = (x) => (x.kind === "session" ? `s:${x.session.address}` : `p:${x.place.kind}:${x.place.space?.id ?? x.place.machine ?? ""}`);
    const chosen = all.find((x) => key(x) === v.pick) ?? shown.find((x) => !x.blocked) ?? null;
    const linkedAt = chosen?.kind === "session" && chosen.why === "linked" ? chosen.session.labels[labelKey(subject)] : null;
    const list = presets(subject, { linkedAt });
    const preset = list[Math.min(v.preset, list.length - 1)];
    const text = v.text ?? preset.text;
    const send = (_e, cx) => {
      if (!chosen) return;
      if (chosen.blocked) {
        v.error = `${chosen.session.name} needs you first. Answer it, then send.`;
        return cx.notify();
      }
      if (!text.trim()) {
        v.error = "Write something first.";
        return cx.notify();
      }
      localStorage.setItem("agent", v.agent);
      const { title } = describe(chosen, subject);
      submit(v, cx, () => (chosen.kind === "session"
        ? sessions.send(chosen.session, text.trim(), subject)
        : sessions.start(chosen.place, v.agent, text.trim(), subject)), chosen.kind === "session" ? `Sent to ${title}` : "Session started");
    };
    const radio = (on) => icon(on ? "radio-button-on" : "radio-button-off").size(20).text_color(on ? t.accent : t.muted);
    const visible = v.query || v.all ? shown : shown.slice(0, SHOWN);
    const rows = visible.map((x) => {
      const d = describe(x, subject);
      const session = x.kind === "session" ? x.session : null;
      return sheetRow(t, key(x), d.title, {
        icon: session ? "ellipse" : "add-circle-outline",
        color: session ? t[session.status] ?? t.muted : t.accent,
        detail: d.detail,
        right: radio(Boolean(chosen) && key(x) === key(chosen)),
        action: (_e, cx) => { v.pick = key(x); v.error = null; cx.notify(); },
      });
    });
    return v_flex().w_full().px(4).pb(8).gap(2)
      .child(head(t, `${p.target.repo} #${p.target.number}`, p.title))
      .child(v_flex().px(14).pb(6)
        .child(input("q").placeholder("Filter sessions and places").h(40).px(12).rounded(10).border(1).border_color(t.input).bg(t.background).text_size(15).text_color(t.foreground)
          .on_change((e, cx) => { v.query = e.text; cx.notify(); })))
      .children(rows)
      .when(v.places === null, (el) => el.child(h_flex().id("finding").px(14).py(10).gap(8).items_center().child(spinner(t)).child(div().text_size(13).text_color(t.muted).child("Looking for clones on your machines…"))))
      .when(!v.query && !v.all && shown.length > SHOWN, (el) => el.child(sheetRow(t, "all", `Show all ${shown.length}`, { icon: "chevron-down", action: (_e, cx) => { v.all = true; cx.notify(); } })))
      .when(chosen?.kind === "place", (el) => el.child(h_flex().id("agents").px(14).pt(6).gap(8).children(AGENTS.map(([id, name]) => h_flex().id(id).h(36).px(14).gap(6).rounded_full().items_center()
        .bg(v.agent === id ? t.accent : t.raised)
        .on_click((_e, cx) => { v.agent = id; cx.notify(); })
        .child(div().text_size(14).font_semibold().text_color(v.agent === id ? t.accent_foreground : t.foreground).child(name))))))
      .child(div().h(1).mx(14).my(6).bg(t.border))
      .child(h_flex().id("presets").px(14).gap(8).flex_wrap().children(list.map((x, i) => h_flex().id(`pre-${x.id}`).h(32).px(12).rounded_full().items_center()
        .bg(x.id === preset.id ? t.accent : t.raised)
        .on_click((_e, cx) => { v.preset = i; v.text = null; cx.notify(); })
        .child(div().text_size(13).font_semibold().text_color(x.id === preset.id ? t.accent_foreground : t.foreground).child(x.label)))))
      .child(v_flex().px(14).pt(8).gap(8)
        .child(input(`msg-${preset.id}`).multiline().value(text).h(120).px(12).py(10).rounded(10).border(1).border_color(t.input).bg(t.background).text_size(15).text_color(t.foreground)
          .on_change((e) => { v.text = e.text; }))
        .child(errorLine(t, v))
        .child(button(t, "send", chosen?.kind === "place" ? "Start" : "Send", { primary: true, busy: v.busy, disabled: !chosen || chosen.blocked, action: send })));
  },
};
