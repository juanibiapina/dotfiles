// How the inbox draws threads and timeline items. Colors are theme names only,
// so light and dark themes both work.

import { div, svg } from "gpui-kit";
import { v_flex, h_flex, TextView } from "gpui-base";

const ICON = (name) => `icons-juan/gh-${name}.svg`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function age(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 60) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / (86400 * 30))}mo`;
}

export function when(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${MONTHS[d.getMonth()]} ${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const REASON = {
  review_requested: "review requested", mention: "mentioned", team_mention: "team mentioned", assign: "assigned",
  author: "yours", comment: "commented", state_change: "state changed", subscribed: "watching", manual: "subscribed",
  ci_activity: "CI", security_alert: "security", invitation: "invited", approval_requested: "approval requested",
};

// The icon and color that say what a thread is and where it stands.
export function look(t, thread, view) {
  const c = { open: t.ansi2, draft: t.dim, merged: t.ansi5, closed: t.ansi1, completed: t.ansi5, "not planned": t.dim };
  if (view?.kind === "pr") {
    const icon = { draft: "pr-draft", merged: "merged", closed: "pr-closed" }[view.state] ?? "pr";
    return { icon: ICON(icon), color: c[view.state] ?? t.muted };
  }
  if (view?.kind === "issue") {
    const icon = { completed: "issue-closed", "not planned": "skip" }[view.state] ?? "issue";
    return { icon: ICON(icon), color: c[view.state] ?? t.muted };
  }
  if (thread.type === "CheckSuite") {
    const r = view?.run?.conclusion ?? (/failed/.test(thread.title) ? "failure" : null);
    if (r === "success") return { icon: ICON("check"), color: t.ansi2 };
    if (r === "failure" || r === "cancelled" || r === "timed_out") return { icon: ICON("x"), color: t.ansi1 };
    return { icon: ICON("dot"), color: t.ansi3 };
  }
  if (thread.type === "PullRequest") return { icon: ICON("pr"), color: t.dim };
  if (thread.type === "Issue") return { icon: ICON("issue"), color: t.dim };
  if (thread.type === "Release") return { icon: ICON("tag"), color: t.accent };
  return { icon: ICON("bell"), color: t.muted };
}

export const icon = (path, color, size = 14) => svg(path).size(size).flex_none().text_color(color);

export const pill = (t, text, fg, bg) =>
  div().flex_none().px(6).h(18).rounded(9).bg(bg ?? t.raised).text_color(fg ?? t.muted).text_size(11).flex().items_center().child(text);

const CI = (t) => ({ success: ["✓", t.ansi2], failure: ["✗", t.ansi1], pending: ["●", t.ansi3] });

export function ciMark(t, state) {
  const m = CI(t)[state];
  return m ? div().flex_none().text_color(m[1]).child(m[0]) : null;
}

const numberOf = (thread) => thread.url?.match(/\/(?:pulls|issues)\/(\d+)$/)?.[1];

// link: the live session the thread was routed to, if any.
export function listRow(t, thread, view, selected, link) {
  const l = look(t, thread, view);
  const n = numberOf(thread);
  const fresh = view?.newCount ?? 0;
  const ci = view?.pr?.ci ? ciMark(t, view.pr.ci) : null;
  const reasonColor = thread.reason === "review_requested" ? t.accent : thread.reason === "mention" || thread.reason === "team_mention" ? t.ansi3 : t.dim;
  return h_flex()
    .id(`row-${thread.id}`)
    .flex_none()
    .pl(6).pr(10).py(7)
    .gap(8)
    .items_start()
    .rounded(7)
    .cursor_pointer()
    .when(selected, (el) => el.bg(t.selected))
    .hover((el) => el.bg(t.hover))
    .child(div().w(6).h(18).flex_none().flex().items_center().child(thread.unread ? div().size(6).rounded(3).bg(t.accent) : div()))
    .child(div().h(18).flex().items_center().child(icon(l.icon, l.color, 15)))
    .child(v_flex().flex_1().min_w(0).gap(2)
      .child(h_flex().gap(8).items_center()
        .child(div().flex_1().min_w(0).truncate().text_color(thread.unread || selected ? t.foreground : t.muted).when(fresh > 0 || selected, (el) => el.font_semibold()).child(thread.title))
        .when(fresh > 0, (el) => el.child(pill(t, view.since ? `${fresh} new` : "new", t.accent_foreground, t.accent)))
        .child(div().flex_none().text_size(11).text_color(t.dim).child(age(thread.updated_at))))
      .child(h_flex().gap(6).items_center().text_size(11.5)
        .child(div().flex_1().min_w(0).truncate().text_color(t.dim).child(`${thread.repo}${n ? `#${n}` : ""}`))
        .when(!!ci, (el) => el.child(ci))
        .when(!!link, (el) => el.child(div().flex_none().max_w(150).truncate().text_color(t[link.status] ?? t.muted).child(`→ ${link.name}`)))
        .child(div().flex_none().text_color(reasonColor).child(REASON[thread.reason] ?? thread.reason.replace(/_/g, " ")))));
}

export function sectionHeader(t, label, count, first) {
  return h_flex().id(`sec-${label}`).flex_none().px(8).pt(first ? 2 : 12).pb(4).gap(6).items_center()
    .child(div().text_size(10.5).font_semibold().text_color(t.dim).child(label.toUpperCase()))
    .child(div().text_size(10.5).text_color(t.dim).child(String(count)));
}

// "2 comments · approved · 3 commits · merged"
export function summaryText(s) {
  const parts = [];
  if (s.comments) parts.push(`${s.comments} comment${s.comments > 1 ? "s" : ""}`);
  const reviews = { APPROVED: "approved", CHANGES_REQUESTED: "changes requested", COMMENTED: "reviewed", DISMISSED: "review dismissed" };
  for (const r of s.reviews) parts.push(reviews[r] ?? "reviewed");
  if (s.commits) parts.push(`${s.commits} commit${s.commits > 1 ? "s" : ""}`);
  parts.push(...s.events);
  return parts.join(" · ");
}

const REVIEW = (t) => ({
  APPROVED: ["approved", t.ansi2], CHANGES_REQUESTED: ["requested changes", t.ansi1],
  COMMENTED: ["reviewed", t.muted], DISMISSED: ["review dismissed", t.dim],
});

function action(t, it) {
  switch (it.kind) {
    case "description": return ["opened this", t.muted];
    case "comment": return ["commented", t.muted];
    case "review": {
      const [word, color] = REVIEW(t)[it.state] ?? ["reviewed", t.muted];
      return [it.inline ? `${word} · ${it.inline} inline comment${it.inline > 1 ? "s" : ""}` : word, color];
    }
    case "commits": return [`pushed ${it.commits.length} commit${it.commits.length > 1 ? "s" : ""}`, t.muted];
    case "event": return [it.event, it.event === "merged" ? t.ansi5 : it.event.startsWith("closed") ? t.ansi1 : it.event === "reopened" ? t.ansi2 : t.muted];
    case "labels": return [[it.added.length ? `added ${it.added.join(", ")}` : "", it.removed.length ? `removed ${it.removed.join(", ")}` : ""].filter(Boolean).join(" · "), t.muted];
    case "review_requested": return [`requested review from ${it.reviewers.join(", ")}`, t.muted];
    case "reference": return [`referenced this in ${it.ref.repo}#${it.ref.number}`, t.muted];
    default: return ["", t.muted];
  }
}

const KIND_ICON = { description: "issue", comment: "comment", review: "eye", commits: "commit", event: "dot", labels: "tag", review_requested: "eye", reference: "pr" };

export function reactions(t, list) {
  if (!list?.length) return null;
  return h_flex().gap(4).flex_wrap().children(list.map((r) =>
    h_flex().px(6).h(20).gap(4).rounded(10).items_center().bg(t.raised).border_1().border_color(r.mine ? t.accent : t.raised)
      .child(div().text_size(12).child(r.emoji))
      .child(div().text_size(11).text_color(r.mine ? t.accent : t.muted).child(String(r.count)))));
}

const clip = (s, n = 5000) => (s.length > n ? `${s.slice(0, n)}\n\n…` : s);

// One entry in a thread's timeline. Small events stay on one line; comments,
// reviews and the description carry their text and reactions.
export function timelineItem(t, it, { selected, fresh, viewer, picker }) {
  const [verb, verbColor] = action(t, it);
  const mine = it.author === viewer;
  const big = it.kind === "description" || it.kind === "comment" || (it.kind === "review" && it.body.trim());
  const head = h_flex().gap(6).items_center().text_size(12)
    .child(icon(ICON(KIND_ICON[it.kind] ?? "dot"), fresh ? t.accent : t.dim, 13))
    .child(div().flex_none().font_semibold().text_color(it.bot ? t.dim : t.foreground).child(mine ? "you" : it.author))
    .child(div().flex_1().min_w(0).truncate().text_color(verbColor).child(verb))
    .child(div().flex_none().text_size(11).text_color(t.dim).child(age(it.at)));
  let el = v_flex().id(`it-${it.id}`).flex_none().px(12).py(big ? 9 : 5).gap(6).rounded(6)
    .border_l_2().border_color(fresh ? t.accent : t.background)
    .when(selected, (e) => e.bg(t.selected))
    .child(head);
  if (it.kind === "commits") {
    el = el.child(v_flex().pl(19).gap(1).text_size(11.5).text_color(t.muted).children(it.commits.slice(-8).map((c) => div().truncate().child(c))));
  }
  if (it.kind === "reference") el = el.child(div().pl(19).text_size(11.5).text_color(t.muted).truncate().child(it.ref.title ?? ""));
  if (big && it.body.trim()) el = el.child(div().pl(19).text_size(12.5).child(TextView.markdown(`md-${it.id}`, clip(it.body))));
  if (big && !it.body.trim() && it.kind === "description") el = el.child(div().pl(19).text_size(12).text_color(t.dim).italic().child("No description."));
  const r = reactions(t, it.reactions);
  if (r) el = el.child(div().pl(19).child(r));
  if (picker) el = el.child(picker);
  return el;
}
