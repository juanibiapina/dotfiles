// The inbox (notifications and a Work tab), the GitHub tab of the phone's
// layout, and a notification's action sheet.

import { div, h_flex, v_flex, icon, input } from "herdr-ui";
import { run, shared, openOverlay, closeOverlay, notify, props } from "herdr";
import { items, loadInbox, loadMe, loadWork, markDone, markRead, unsubscribe, target, webUrl, errorText, failed } from "./api.js";
import { ago, avatar, chip, spinner, sheetRow } from "./ui.js";
import { listSessions, send, goTo, spaceFor } from "./sessions.js";
import { linkIndex, labelKey, presets } from "./routing.js";

export const open = (p, title) => run("screen.open", { mod: "github", props: p, title }).catch(failed);

/** The route sheet: { notification?: thread id, kind: "pr" | "issue" | "ci" | "release" | "other", target: { repo, number? }, title, url, failing?, reason? }. */
export const sendTo = (p) => openOverlay({ mod: "github", kind: "sheet", props: { sheet: "route", ...p } });

const KIND = { PullRequest: "pr", Issue: "issue", Release: "release" };

/** What the route sheet needs of a notification. A CI run that failed asks for the cause; any other just points at it. */
export function noteRoute(n) {
  const num = n.url && n.url.match(/\/(?:pulls|issues)\/(\d+)$/);
  const failing = n.type === "CheckSuite" && /failed/i.test(n.title);
  return {
    kind: failing ? "ci" : KIND[n.type] ?? "other",
    notification: n.id, target: { repo: n.repo, ...(num ? { number: Number(num[1]) } : {}) },
    title: n.title, url: webUrl(n), reason: n.reason, failing,
  };
}

/** Opens what a notification is about and marks it read. It stays in the inbox until it's done. */
export function openNote(n) {
  markRead(n);
  const tg = target(n);
  if (!tg) return openOverlay({ mod: "github", kind: "sheet", props: { sheet: "item", item: n } });
  const num = n.url && n.url.match(/\/(\d+)$/);
  const title = n.type === "PullRequest" || n.type === "Issue" ? `#${num ? num[1] : ""}` : n.type === "Release" ? "Release" : "Workflow runs";
  return open({ ...tg, thread: n }, title);
}

// Every notification not marked done, read or unread, as desktop's notices count them.
const count = () => (items() ?? []).length;

// ---- Inbox ----

const REASON = {
  review_requested: "review requested",
  ci_activity: "CI",
  team_mention: "team mention",
  security_alert: "security",
  state_change: "state changed",
  comment: "comment",
  author: "author",
  mention: "mention",
  assign: "assigned",
  subscribed: "watching",
  manual: "subscribed",
};

function noteLook(t, n) {
  switch (n.type) {
    case "PullRequest": return { icon: "git-pull-request", color: t.done };
    case "Issue": return { icon: "radio-button-on", color: t.done };
    case "Release": return { icon: "pricetag", color: t.accent };
    case "Discussion": return { icon: "chatbubbles", color: t.ansi5 };
    case "Commit": return { icon: "git-commit", color: t.muted };
    case "CheckSuite": return /failed/i.test(n.title) ? { icon: "close-circle", color: t.blocked } : { icon: "checkmark-circle", color: t.done };
    default: return { icon: "notifications", color: t.muted };
  }
}

// Sections by how much a notification needs you, as in the desktop inbox.
// Desktop also moves merged or closed PRs out of Review requested and bot
// threads into CI, from each thread it loads; the phone loads none up front.
const SECTIONS = [
  ["snoozed", "Snoozed sessions"],
  ["review", "Review requested"],
  ["mention", "Mentioned"],
  ["yours", "Yours"],
  ["talk", "Conversations"],
  ["other", "CI, releases & bots"],
];

// A thread that changed after its session was snoozed (dev herdr snooze sets
// juan.snooze=<time>) waits on Juan first.
function sectionOf(n, link) {
  const since = link?.labels?.["juan.snooze"];
  if (since && Date.parse(n.updated_at) > Date.parse(since)) return "snoozed";
  if (n.reason === "review_requested") return "review";
  if (["mention", "team_mention", "assign"].includes(n.reason)) return "mention";
  if (n.reason === "author") return "yours";
  if (["PullRequest", "Issue", "Discussion"].includes(n.type)) return "talk";
  return "other";
}

function fuzzy(text, query) {
  const t = text.toLowerCase();
  let at = 0;
  for (const ch of query.replace(/\s+/g, "")) {
    const i = t.indexOf(ch, at);
    if (i < 0) return false;
    at = i + 1;
  }
  return true;
}

const number = (n) => {
  const m = n.url && n.url.match(/\/(pulls|issues)\/(\d+)$/);
  return m ? ` #${m[2]}` : "";
};

// The live session a notification's thread was last sent to, from an index of all of them.
function linkOf(links, n) {
  const num = Number(n.url?.match(/\/(?:pulls|issues)\/(\d+)$/)?.[1]);
  const key = num ? labelKey({ repo: n.repo, number: num }) : null;
  return key ? links.get(key)?.[0]?.session ?? null : null;
}

// Wakes the notification's snoozed session and sends it the New activity
// message, like y in the desktop inbox, and marks the notification read.
function wakeAndSend(n, link) {
  const r = noteRoute(n);
  const subject = { notification: r.notification, repo: r.target.repo, number: r.target.number, kind: r.kind, url: r.url, title: r.title, reason: r.reason, failing: r.failing };
  const text = presets(subject, { linkedAt: link.labels[labelKey(subject)] })[0].text;
  markRead(n);
  send(link, text, subject)
    .then(() => notify({ title: `Woke ${link.name}` }))
    .catch((e) => notify({ title: "Could not wake it", body: errorText(e), level: "error" }));
}

function noteRow(t, n, link) {
  const look = noteLook(t, n);
  const snoozed = Boolean(link?.labels?.["juan.snooze"]);
  return h_flex().id(n.id).min_h(68).pl(10).pr(16).py(10).gap(10).items_center()
    .on_click(() => openNote(n))
    .on_long_press(() => openOverlay({ mod: "github", kind: "sheet", props: { sheet: "item", item: n } }))
    .swipe("right", { label: "Done", color: t.done, action: () => markDone([n]) })
    .when(snoozed, (el) => el.swipe("left", { label: "Wake", color: t.accent, action: () => wakeAndSend(n, link) }))
    .child(div().size(8).rounded_full().bg(n.unread ? t.accent : t.background))
    .child(h_flex().size(34).flex_none().rounded_full().bg(look.color + "1f").items_center().justify_center()
      .child(icon(look.icon).size(18).text_color(n.unread ? look.color : t.dim)))
    .child(v_flex().flex_1().min_w(0).gap(3)
      .child(div().truncate().text_size(12).text_color(t.muted).child(`${n.repo}${number(n)}`))
      .child(div().line_clamp(2).text_size(15).text_color(n.unread ? t.foreground : t.muted).when(n.unread, (e) => e.font_semibold()).child(n.title))
      .child(h_flex().gap(8).items_center().child(div().flex_none().text_size(12).text_color(n.reason === "review_requested" || n.reason === "mention" ? t.working : t.dim).child(REASON[n.reason] ?? n.reason.replace(/_/g, " ")))
        .when(Boolean(link), (el) => el.child(div().flex_1().min_w(0).truncate().text_size(12).text_color(snoozed ? t.dim : t[link.status] ?? t.muted).child(`→ ${link.name}${snoozed ? " · snoozed" : ""}`)))))
    .child(div().self_start().pt(2).text_size(12).text_color(t.dim).child(ago(n.updated_at)));
}

function workRow(t, x, kind) {
  const repo = x.repository.nameWithOwner;
  return h_flex().id(`${repo}#${x.number}`).min_h(64).px(16).py(10).gap(12).items_center()
    .on_click(() => open({ [kind]: { repo, number: x.number } }, `#${x.number}`))
    .child(avatar(t, x.author?.login, 30))
    .child(v_flex().flex_1().min_w(0).gap(3)
      .child(div().truncate().text_size(12).text_color(t.muted).child(`${repo} #${x.number}`))
      .child(div().line_clamp(2).text_size(15).text_color(t.foreground).child(x.title))
      .child(h_flex().gap(6).items_center()
        .when(Boolean(x.isDraft), (el) => el.child(chip(t, "Draft", t.muted)))
        .child(div().text_size(12).text_color(t.dim).child(`${x.author?.login ?? ""} · ${x.commentsCount ?? 0} comments`))))
    .child(div().self_start().pt(2).text_size(12).text_color(t.dim).child(ago(x.updatedAt)));
}

export const inbox = {
  init(v, cx) {
    v.tab = localStorage.getItem("tab") ?? "inbox";
    v.reload = (cx) => (v.tab === "work" ? inbox.loadWork(v, cx) : inbox.loadInbox(v, cx));
    // The tab stays alive while the layout does: it keeps the list and the
    // tab's badge fresh.
    cx.timer.every(120000, (cx) => inbox.loadInbox(v, cx));
    loadMe().catch(() => {});
    v.reload(cx);
  },
  loadInbox(v, cx) {
    if (v.loading) return;
    v.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        await loadInbox();
        v.error = null;
      } catch (e) {
        v.error = errorText(e);
      }
      v.loading = false;
      cx.notify();
    });
  },
  loadWork(v, cx) {
    if (v.workLoading) return;
    v.workLoading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        await loadWork();
        v.workError = null;
      } catch (e) {
        v.workError = errorText(e);
      }
      v.workLoading = false;
      cx.notify();
    });
  },
  render(v, t, cx) {
    const pill = (id, text, on, count) => h_flex().id(id).flex_1().h(36).gap(6).rounded(9).items_center().justify_center()
      .bg(on ? t.raised : t.surface)
      .on_click((_e, cx) => {
        v.tab = id;
        localStorage.setItem("tab", id);
        if (id === "work" && !shared("github.work")) inbox.loadWork(v, cx);
        cx.notify();
      })
      .child(div().text_size(14).font_semibold().text_color(on ? t.foreground : t.muted).child(text))
      .when(count > 0, (el) => el.child(h_flex().min_w(20).h(20).px(5).rounded_full().bg(t.accent).items_center().justify_center()
        .child(div().text_size(11).font_bold().text_color(t.accent_foreground).child(String(count)))));
    const work = shared("github.work");
    const tabs = h_flex().id("tabs").mx(12).mt(8).mb(4).p(3).gap(3).rounded(12).bg(t.surface)
      .child(pill("inbox", "Inbox", v.tab === "inbox", count()))
      .child(pill("work", "Work", v.tab === "work", work ? work.review.length : 0));
    return v_flex().size_full().bg(t.background)
      .child(tabs)
      .child(v.tab === "work" ? inbox.work(v, t, work) : inbox.notes(v, t));
  },
  // "Done all" asks for a second tap, like D twice on desktop; the first
  // tap's offer lapses after a few seconds.
  doneAll(v, cx, g) {
    if (v.confirm !== g.key) {
      v.confirm = g.key;
      const at = (v.confirmAt = Date.now());
      cx.timer.after(4000, (cx) => {
        if (v.confirmAt === at) v.confirm = null;
        cx.notify();
      });
      return cx.notify();
    }
    v.confirm = null;
    markDone(g.list).then(() => notify({ title: `Done: ${g.list.length} in ${g.label}`, level: "success" }));
    cx.notify();
  },
  notes(v, t) {
    const all = items();
    const q = (v.query ?? "").trim().toLowerCase();
    const links = linkIndex(listSessions());
    const groups = SECTIONS.map(([key, label]) => ({ key, label, list: [] }));
    for (const n of all ?? []) {
      const link = linkOf(links, n);
      if (q && !fuzzy(`${n.repo} ${n.title} ${REASON[n.reason] ?? n.reason} ${n.type}`, q)) continue;
      groups.find((g) => g.key === sectionOf(n, link)).list.push({ n, link });
    }
    const shown = groups.filter((g) => g.list.length);
    const matched = shown.reduce((k, g) => k + g.list.length, 0);
    const bar = h_flex().id("bar").h(40).pl(16).pr(8).items_center().justify_between()
      .child(h_flex().gap(8).items_center()
        .child(div().text_size(13).text_color(t.muted).child(all === null ? "Loading…" : q ? `${matched} of ${all.length} notifications` : `${all.length} notifications`))
        .when(Boolean(v.loading), (el) => el.child(spinner(t, 14))))
      .child(h_flex().id("search").size(40).items_center().justify_center()
        .on_click((_e, cx) => { v.searching = !v.searching; v.query = ""; cx.notify(); })
        .child(icon(v.searching ? "close" : "search").size(20).text_color(t.muted)));
    const rows = [];
    for (const g of shown) {
      const asking = v.confirm === g.key;
      rows.push(h_flex().id(`s-${g.key}`).pl(16).pr(8).pt(14).pb(2).gap(8).items_center()
        .child(div().text_size(12).font_bold().text_color(g.key === "snoozed" ? t.accent : t.dim).child(g.label.toUpperCase()))
        .child(div().flex_1().text_size(12).text_color(t.dim).child(String(g.list.length)))
        .child(h_flex().id("done-all").h(32).px(10).rounded(8).items_center().when(asking, (el) => el.bg(t.done + "22"))
          .on_click((_e, cx) => inbox.doneAll(v, cx, { ...g, list: g.list.map((x) => x.n) }))
          .child(div().text_size(12).font_semibold().text_color(asking ? t.done : t.muted).child(asking ? `Tap again: done ${g.list.length}` : "Done all"))));
      for (const { n, link } of g.list) rows.push(noteRow(t, n, link));
    }
    const empty = v_flex().id("empty").pt(64).items_center().gap(12)
      .child(icon(q ? "search-outline" : "checkmark-done-circle-outline").size(48).text_color(t.dim))
      .child(div().text_size(15).text_color(t.muted).child(q ? "No match" : "Inbox zero"));
    return v_flex().flex_1()
      .child(bar)
      .when(Boolean(v.searching), (el) => el.child(v_flex().id("filter").px(12).pb(6)
        .child(input("filter").autofocus().placeholder("Filter by repo, title or reason").h(40).px(12).rounded(10).border(1).border_color(t.input)
          .bg(t.background).text_size(15).text_color(t.foreground).on_change((e, cx) => { v.query = e.text; cx.notify(); }))))
      .when(Boolean(v.error), (el) => el.child(div().px(16).pb(8).text_size(13).text_color(t.blocked).child(v.error)))
      .child(v_flex().flex_1().overflow_y_scroll()
        .on_refresh((_e, cx) => inbox.loadInbox(v, cx))
        .children(all !== null && matched === 0 ? [empty] : rows)
        .child(div().id("end").h(24)));
  },
  work(v, t, work) {
    const section = (id, title, list, kind) => v_flex().id(id)
      .child(h_flex().px(16).pt(16).pb(6).gap(8).items_center()
        .child(div().text_size(12).font_bold().text_color(t.dim).child(title.toUpperCase()))
        .child(div().text_size(12).text_color(t.dim).child(String(list.length))))
      .when(list.length === 0, (el) => el.child(div().px(16).py(8).text_size(14).text_color(t.dim).child("None")))
      .children(list.map((x) => workRow(t, x, kind)));
    return v_flex().flex_1().overflow_y_scroll()
      .on_refresh((_e, cx) => inbox.loadWork(v, cx))
      .child(h_flex().id("bar").h(32).px(16).gap(8).items_center()
        .child(div().text_size(13).text_color(t.muted).child(work ? (Date.now() - work.at < 60000 ? "Updated just now" : `Updated ${ago(new Date(work.at).toISOString())} ago`) : "Loading…"))
        .when(Boolean(v.workLoading), (el) => el.child(spinner(t, 14))))
      .when(Boolean(v.workError), (el) => el.child(div().px(16).pb(8).text_size(13).text_color(t.blocked).child(v.workError)))
      .when(Boolean(work), (el) => el
        .child(section("review", "Review requested", work.review, "pr"))
        .child(section("mine", "Your pull requests", work.mine, "pr"))
        .child(section("issues", "Assigned issues", work.issues, "ref")))
      .child(div().id("end").h(24));
  },
};

// ---- A notification's actions ----

export const itemSheet = {
  render(_v, t) {
    const n = props().item;
    const close = () => closeOverlay(props().overlay);
    const act = (id, title, f, opts = {}) => sheetRow(t, id, title, { ...opts, action: () => { close(); f(); } });
    const tg = target(n);
    const link = linkOf(linkIndex(listSessions()), n);
    const space = link ? null : spaceFor(n.repo);
    const num = Number(n.url?.match(/\/(?:pulls|issues)\/(\d+)$/)?.[1]) || null;
    return v_flex().w_full().px(4).pb(8)
      .child(v_flex().px(14).pb(10).gap(4)
        .child(div().text_size(12).text_color(t.muted).child(`${n.repo}${number(n)}`))
        .child(div().line_clamp(3).text_size(17).font_bold().text_color(t.foreground).child(n.title)))
      .when(Boolean(link?.labels?.["juan.snooze"]), (el) => el.child(act("wake", "Wake and send", () => wakeAndSend(n, link), { icon: "alarm-outline", color: t.accent, detail: `Bring back ${link.name} with this activity` })))
      .when(Boolean(tg), (el) => el.child(act("open", "Open", () => openNote(n), { icon: "open-outline" })))
      .child(act("route", "Send to a session", () => sendTo(noteRoute(n)), { icon: "sparkles-outline", color: t.accent, detail: "A running agent, or a new one" }))
      .when(Boolean(link), (el) => el.child(act("session", `Go to ${link.name}`, () => goTo(link).catch((e) => notify({ title: "Could not go there", body: errorText(e), level: "error" })),
        { icon: "arrow-forward-circle-outline", detail: link.labels["juan.snooze"] ? "Wakes it first" : [link.space, link.machine].filter(Boolean).join(" · ") })))
      .when(Boolean(space), (el) => el.child(act("space", `Go to ${space.name}`, () => run("screen.open", { mod: "space", props: { space: space.id }, title: space.name }),
        { icon: "albums-outline", detail: "The repo's space" })))
      .when(Boolean(num), (el) => el.child(act("labels", "Labels", () => openOverlay({ mod: "github", kind: "sheet", props: { sheet: "labels", target: { repo: n.repo, number: num }, title: n.title } }), { icon: "pricetag-outline" })))
      .child(act("copy", "Copy link", () => run("clipboard.copy", { text: webUrl(n) }).then(() => notify({ title: "Link copied" })), { icon: "link-outline", detail: webUrl(n) }))
      .child(act("done", "Done", () => markDone([n]), { icon: "checkmark-done-outline", detail: "Delete it from your GitHub inbox" }))
      .child(act("unsub", "Unsubscribe", () => unsubscribe(n), { icon: "notifications-off-outline", detail: "No more notifications from this thread", danger: true }));
  },
};

