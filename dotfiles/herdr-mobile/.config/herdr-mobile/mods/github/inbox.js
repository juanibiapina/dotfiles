// The header bell, the inbox (notifications and a Work tab) and a
// notification's action sheet.

import { div, h_flex, v_flex, icon } from "herdr-ui";
import { run, shared, openOverlay, closeOverlay, notify, props } from "herdr";
import { items, loadInbox, loadMe, loadWork, markDone, markRead, unsubscribe, target, webUrl, errorText, failed } from "./api.js";
import { ago, avatar, chip, spinner, sheetRow } from "./ui.js";
import { listSessions } from "./sessions.js";
import { linkIndex, labelKey } from "./routing.js";

export const open = (p, title) => run("screen.open", { mod: "github", props: p, title }).catch(failed);

/** Opens what a notification is about and marks it read. It stays in the inbox until it's done. */
export function openNote(n) {
  markRead(n);
  const tg = target(n);
  if (!tg) return openOverlay({ mod: "github", kind: "sheet", props: { sheet: "item", item: n } });
  const num = n.url && n.url.match(/\/(\d+)$/);
  const title = n.type === "PullRequest" || n.type === "Issue" ? `#${num ? num[1] : ""}` : n.type === "Release" ? "Release" : "Workflow runs";
  return open({ ...tg, thread: n }, title);
}

const unreadCount = () => (items() ?? []).filter((n) => n.unread).length;

// ---- Header ----

export const header = {
  init(v, cx) {
    const poll = (cx) => {
      if (v.polling) return;
      v.polling = true;
      cx.spawn(async () => {
        try {
          await Promise.all([loadInbox(), loadMe()]);
        } catch (_) {
          // The inbox shows the error when it's opened.
        }
        v.polling = false;
      });
    };
    cx.timer.every(120000, poll);
    poll(cx);
  },
  render(v, t) {
    const n = unreadCount();
    const round = (id, child, action) => h_flex().id(id).size(36).rounded_full().items_center().justify_center().on_click(action).child(child);
    return h_flex().gap(4).items_center()
      .child(round("github", div().size(36).items_center().justify_center()
        .child(icon("logo-github").size(24).text_color(t.foreground))
        .when(n > 0, (el) => el.child(h_flex().absolute().top(0).right(0).min_w(18).h(18).px(4).rounded_full().bg(t.blocked).items_center().justify_center()
          .child(div().text_size(11).font_bold().text_color("#ffffff").child(n > 99 ? "99+" : String(n))))),
        () => open({}, "GitHub")))
      .child(round("settings", icon("settings-outline").size(24).text_color(t.foreground), () => run("app.settings")));
  },
};

// ---- Inbox ----

const FILTERS = [
  ["all", "All", () => true],
  ["unread", "Unread", (n) => n.unread],
  ["review", "Review requests", (n) => n.reason === "review_requested"],
  ["mention", "Mentions", (n) => n.reason === "mention" || n.reason === "team_mention"],
  ["pr", "Pull requests", (n) => n.type === "PullRequest"],
  ["issue", "Issues", (n) => n.type === "Issue"],
  ["ci", "CI", (n) => n.type === "CheckSuite"],
  ["release", "Releases", (n) => n.type === "Release"],
];

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

function day(iso) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This week";
  if (diff < 30) return "This month";
  return "Older";
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

function noteRow(t, n, link) {
  const look = noteLook(t, n);
  return h_flex().id(n.id).min_h(68).pl(10).pr(16).py(10).gap(10).items_center()
    .on_click(() => openNote(n))
    .on_long_press(() => openOverlay({ mod: "github", kind: "sheet", props: { sheet: "item", item: n } }))
    .swipe("right", { label: "Done", color: t.done, action: () => markDone([n]) })
    .child(div().size(8).rounded_full().bg(n.unread ? t.accent : t.background))
    .child(h_flex().size(34).flex_none().rounded_full().bg(look.color + "1f").items_center().justify_center()
      .child(icon(look.icon).size(18).text_color(n.unread ? look.color : t.dim)))
    .child(v_flex().flex_1().min_w(0).gap(3)
      .child(div().truncate().text_size(12).text_color(t.muted).child(`${n.repo}${number(n)}`))
      .child(div().line_clamp(2).text_size(15).text_color(n.unread ? t.foreground : t.muted).when(n.unread, (e) => e.font_semibold()).child(n.title))
      .child(h_flex().gap(8).items_center().child(div().flex_none().text_size(12).text_color(n.reason === "review_requested" || n.reason === "mention" ? t.working : t.dim).child(REASON[n.reason] ?? n.reason.replace(/_/g, " ")))
        .when(Boolean(link), (el) => el.child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t[link.status] ?? t.muted).child(`→ ${link.name}`)))))
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
    v.filter = localStorage.getItem("filter") ?? "all";
    v.reload = (cx) => (v.tab === "work" ? inbox.loadWork(v, cx) : inbox.loadInbox(v, cx));
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
      .child(pill("inbox", "Inbox", v.tab === "inbox", unreadCount()))
      .child(pill("work", "Work", v.tab === "work", work ? work.review.length : 0));
    return v_flex().size_full().bg(t.background)
      .child(tabs)
      .child(v.tab === "work" ? inbox.work(v, t, work) : inbox.notes(v, t));
  },
  notes(v, t) {
    const all = items();
    const f = FILTERS.find((x) => x[0] === v.filter) ?? FILTERS[0];
    const shown = (all ?? []).filter(f[2]);
    const chips = div().id("filters").overflow_x_scroll().flex_none().child(h_flex().px(12).py(8).gap(8)
      .children(FILTERS.map(([id, text, pred]) => {
        const on = id === f[0];
        const count = (all ?? []).filter(pred).length;
        if (id !== "all" && count === 0) return null;
        return h_flex().id(id).h(32).px(12).gap(6).rounded_full().items_center()
          .bg(on ? t.accent : t.surface).border(1).border_color(on ? t.accent : t.border)
          .on_click((_e, cx) => {
            v.filter = id;
            localStorage.setItem("filter", id);
            cx.notify();
          })
          .child(div().text_size(13).font_semibold().text_color(on ? t.accent_foreground : t.foreground).child(text))
          .child(div().text_size(12).text_color(on ? t.accent_foreground : t.muted).child(String(count)));
      })));
    const bar = h_flex().id("bar").h(36).px(16).items_center().justify_between()
      .child(h_flex().gap(8).items_center()
        .child(div().text_size(13).text_color(t.muted).child(all === null ? "Loading…" : `${shown.length} notifications`))
        .when(Boolean(v.loading), (el) => el.child(spinner(t, 14))));
    const rows = [];
    const links = linkIndex(listSessions());
    let last = null;
    for (const n of shown) {
      const d = day(n.updated_at);
      if (d !== last) {
        rows.push(div().id(`d-${d}`).px(16).pt(14).pb(4).text_size(12).font_bold().text_color(t.dim).child(d.toUpperCase()));
        last = d;
      }
      rows.push(noteRow(t, n, linkOf(links, n)));
    }
    const empty = v_flex().id("empty").pt(64).items_center().gap(12)
      .child(icon("checkmark-done-circle-outline").size(48).text_color(t.dim))
      .child(div().text_size(15).text_color(t.muted).child(f[0] === "all" ? "Inbox zero" : "Nothing here"));
    return v_flex().flex_1()
      .child(chips)
      .child(bar)
      .when(Boolean(v.error), (el) => el.child(div().px(16).pb(8).text_size(13).text_color(t.blocked).child(v.error)))
      .child(v_flex().flex_1().overflow_y_scroll()
        .on_refresh((_e, cx) => inbox.loadInbox(v, cx))
        .children(all !== null && shown.length === 0 ? [empty] : rows)
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
    return v_flex().w_full().px(4).pb(8)
      .child(v_flex().px(14).pb(10).gap(4)
        .child(div().text_size(12).text_color(t.muted).child(`${n.repo}${number(n)}`))
        .child(div().line_clamp(3).text_size(17).font_bold().text_color(t.foreground).child(n.title)))
      .when(Boolean(tg), (el) => el.child(act("open", "Open", () => openNote(n), { icon: "open-outline" })))
      .when(Boolean(tg?.pr || tg?.issue), (el) => el.child(act("route", "Send to a session", () => openOverlay({ mod: "github", kind: "sheet", props: { sheet: "route", kind: tg.pr ? "pr" : "issue", target: tg.pr ?? tg.issue, title: n.title, url: webUrl(n), reason: n.reason } }), { icon: "sparkles-outline", color: t.accent, detail: "A running agent, or a new one" })))
      .child(act("copy", "Copy link", () => run("clipboard.copy", { text: webUrl(n) }).then(() => notify({ title: "Link copied" })), { icon: "link-outline", detail: webUrl(n) }))
      .child(act("done", "Done", () => markDone([n]), { icon: "checkmark-done-outline", detail: "Delete it from your GitHub inbox" }))
      .child(act("unsub", "Unsubscribe", () => unsubscribe(n), { icon: "notifications-off-outline", detail: "No more notifications from this thread", danger: true }));
  },
};

