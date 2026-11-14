// Small pieces every GitHub page uses.

import { div, h_flex, v_flex, icon, svg } from "herdr-ui";

export function ago(iso) {
  if (!iso) return "";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d`;
  if (s < 86400 * 365) return `${Math.floor(s / (86400 * 30))}mo`;
  return `${Math.floor(s / (86400 * 365))}y`;
}

export function duration(from, to) {
  if (!from || !to) return "";
  const s = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

export function bytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const PALETTE = ["ansi1", "ansi2", "ansi3", "ansi4", "ansi5", "ansi6", "ansi9", "ansi10", "ansi11", "ansi12", "ansi13", "ansi14"];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** A round initial for a login: no network images here. */
export function avatar(t, login, size = 28) {
  const name = (login || "?").replace(/\[bot\]$/, "");
  const color = t[PALETTE[hash(name) % PALETTE.length]];
  return h_flex().size(size).flex_none().rounded_full().bg(color + "33").items_center().justify_center()
    .child(div().text_size(Math.round(size * 0.45)).font_bold().text_color(color).child(name[0].toUpperCase()));
}

export const chip = (t, text, color, opts = {}) =>
  h_flex().flex_none().gap(4).px(8).py(3).rounded_full().items_center()
    .bg(opts.solid ? color : color + "22")
    .when(Boolean(opts.icon), (el) => el.child(icon(opts.icon).size(13).text_color(opts.solid ? "#ffffff" : color)))
    .child(div().text_size(12).font_semibold().text_color(opts.solid ? "#ffffff" : color).child(text));

/** A label in its own GitHub color. */
export const label = (t, l) => chip(t, l.name, `#${(l.color || "8b949e").slice(0, 6)}`);

export function prState(t, pr) {
  if (pr.state === "MERGED") return { text: "Merged", color: t.ansi5, icon: "git-merge" };
  if (pr.state === "CLOSED") return { text: "Closed", color: t.blocked, icon: "git-pull-request" };
  if (pr.isDraft) return { text: "Draft", color: t.muted, icon: "git-pull-request" };
  return { text: "Open", color: t.done, icon: "git-pull-request" };
}

export function issueState(t, is) {
  if (is.state === "OPEN") return { text: "Open", color: t.done, icon: "radio-button-on" };
  if (is.stateReason === "NOT_PLANNED") return { text: "Not planned", color: t.muted, icon: "remove-circle-outline" };
  return { text: "Closed", color: t.ansi5, icon: "checkmark-circle-outline" };
}

export const stateChip = (t, s) => chip(t, s.text, s.color, { solid: true, icon: s.icon });

// Check and run states, normalized: pass, fail, pending, skip, cancel, neutral.
export function checkLook(t, state) {
  return {
    pass: { icon: "checkmark-circle", color: t.done },
    fail: { icon: "close-circle", color: t.blocked },
    pending: { icon: null, color: t.working },
    skip: { icon: "remove-circle-outline", color: t.dim },
    cancel: { icon: "stop-circle-outline", color: t.muted },
    neutral: { icon: "ellipse-outline", color: t.muted },
  }[state] ?? { icon: "ellipse-outline", color: t.muted };
}

export function checkIcon(t, state, size = 18) {
  const l = checkLook(t, state);
  if (!l.icon) return svg("icons/ui/spinner.svg").size(size).text_color(l.color).spin(1100);
  return icon(l.icon).size(size).text_color(l.color);
}

export function runState(r) {
  if (r.status !== "completed") return "pending";
  return { success: "pass", failure: "fail", timed_out: "fail", startup_failure: "fail", action_required: "fail", cancelled: "cancel", skipped: "skip", neutral: "neutral" }[r.conclusion] ?? "neutral";
}

export const card = (t) => v_flex().mx(12).rounded(12).bg(t.surface).border(1).border_color(t.border).overflow_hidden();

export const sectionTitle = (t, text, right) =>
  h_flex().px(16).pt(20).pb(8).items_center().justify_between()
    .child(div().text_size(13).font_bold().text_color(t.muted).child(text.toUpperCase()))
    .when(Boolean(right), (el) => el.child(right));

export const spinner = (t, size = 18) => svg("icons/ui/spinner.svg").size(size).text_color(t.muted).spin(900);

export function button(t, id, text, opts = {}) {
  const bg = opts.color ?? (opts.primary ? t.solid : t.raised);
  const fg = opts.fg ?? (opts.primary ? t.solid_foreground : t.foreground);
  return h_flex().id(id).min_h(44).px(14).gap(6).rounded(10).bg(bg).items_center().justify_center()
    .when(Boolean(opts.flex), (el) => el.flex_1())
    .when(Boolean(opts.disabled), (el) => el.opacity(0.4))
    .when(!opts.disabled && Boolean(opts.action), (el) => el.on_click(opts.action))
    .when(Boolean(opts.busy), (el) => el.child(svg("icons/ui/spinner.svg").size(16).text_color(fg).spin(900)))
    .when(Boolean(opts.icon) && !opts.busy, (el) => el.child(icon(opts.icon).size(18).text_color(fg)))
    .when(Boolean(text), (el) => el.child(div().text_size(15).font_semibold().text_color(fg).child(text)));
}

/** A row in an action sheet. */
export const sheetRow = (t, id, title, opts = {}) =>
  h_flex().id(id).min_h(52).px(14).py(10).gap(14).rounded(10).items_center()
    .when(Boolean(opts.action), (el) => el.on_click(opts.action))
    .when(Boolean(opts.icon), (el) => el.child(icon(opts.icon).size(22).text_color(opts.danger ? t.blocked : opts.color ?? t.muted)))
    .child(v_flex().flex_1().min_w(0)
      .child(div().text_size(16).font_semibold().text_color(opts.danger ? t.blocked : t.foreground).child(title))
      .when(Boolean(opts.detail), (el) => el.child(div().mt(2).line_clamp(2).text_size(13).text_color(t.muted).child(opts.detail))))
    .when(Boolean(opts.right), (el) => el.child(opts.right));

/** A loading or failed page. */
export function placeholder(t, error, retry) {
  return v_flex().size_full().bg(t.background).items_center().pt(80).gap(14).px(24)
    .child(error ? icon("cloud-offline-outline").size(40).text_color(t.blocked) : spinner(t, 28))
    .when(Boolean(error), (el) => el
      .child(div().text_size(14).text_center().text_color(t.muted).child(error))
      .child(button(t, "retry", "Try again", { action: retry })));
}
