// Mail: the Gmail inbox through gog on the definition machine, like desktop's
// mail mod (ctrl-space e) made for the phone. Reading never marks mail read.
//
// One mod, several faces, chosen by props:
//   {}                       the inbox: the 50 newest threads; it polls and sets the badge
//   { thread: id }           a thread: its messages, the newest open, quoted history folded
//   { sheet: "<name>", id }  a sheet: actions, labels, route (send to a session)
//
// Swipe right archives (and marks read), swipe left trashes; an Undo bar puts
// the last one back. Labels change at once and come back if gog fails.
// Shared state: "mail.list" (the threads), "mail.unread" (the tab's badge),
// "mail.labels" (user labels), "mail.cached" (thread id → cache key of the
// decoded thread in ~/.cache/herdr-mail), "mail.undo" (the last archive or trash).

import { View, div, h_flex, v_flex, icon, svg, input } from "herdr-ui";
import { theme, props, run, exec, notify, shared, setShared, openOverlay, closeOverlay, safeArea, layout, agents, spaces, machines } from "herdr";
import * as gmail from "./gmail.js";
import { lines } from "./message.js";

const POLL_MS = 120000;
const UNDO_MS = 8000;
const NOTES = { machine: "mini", name: "notes", folder: "Sync/notes" }; // new sessions start here, as on desktop

const errorText = (e) => String((e && e.message) || e);
const failed = (e) => notify({ title: "Gmail said no", body: errorText(e), level: "error", timeout: 8000 });
const copy = (text, what) => run("clipboard.copy", { text }).then(() => notify({ title: `${what} copied`, body: text }));

// ---- The shared list ----

const list = () => shared("mail.list") ?? null;
const itemOf = (id) => (list() ?? []).find((th) => th.id === id) ?? null;
function setList(all) {
  setShared("mail.list", all);
  const unread = all.filter((th) => th.unread).length;
  if (shared("mail.unread") !== unread) setShared("mail.unread", unread);
}

function putBack(item, at) {
  const all = list() ?? [];
  if (all.some((th) => th.id === item.id)) return;
  setList([...all.slice(0, at), item, ...all.slice(at)]);
}

// Takes the thread out of the list at once and puts it back if Gmail refuses.
function remove(id, kind) {
  const all = list() ?? [];
  const at = all.findIndex((th) => th.id === id);
  if (at < 0) return;
  const item = all[at];
  setList(all.filter((th) => th.id !== id));
  setShared("mail.undo", { item, at, kind, time: Date.now() });
  const change = kind === "archive" ? { remove: ["INBOX", "UNREAD"] } : { add: ["TRASH"], remove: ["INBOX"] };
  gmail.modify(id, change).catch((e) => {
    putBack(item, at);
    if (shared("mail.undo")?.item?.id === id) setShared("mail.undo", null);
    failed(e);
  });
}

function undo() {
  const u = shared("mail.undo");
  if (!u) return;
  setShared("mail.undo", null);
  putBack(u.item, u.at);
  const change = u.kind === "archive" ? { add: u.item.unread ? ["INBOX", "UNREAD"] : ["INBOX"] } : { add: ["INBOX"], remove: ["TRASH"] };
  gmail.modify(u.item.id, change)
    .then(() => notify({ title: u.kind === "archive" ? "Back in the inbox" : "Back from the trash", level: "success" }))
    .catch(failed);
}

function toggleLabel(id, label) {
  const th = itemOf(id);
  if (!th) return;
  const has = th.labels.includes(label);
  const set = (labels) => setList((list() ?? []).map((x) => (x.id === id ? { ...x, labels } : x)));
  set(has ? th.labels.filter((l) => l !== label) : [...th.labels, label]);
  gmail.modify(id, has ? { remove: [label] } : { add: [label] }).catch((e) => {
    const now = itemOf(id);
    if (now) set(has ? [...now.labels, label] : now.labels.filter((l) => l !== label));
    failed(e);
  });
}

const sheet = (name, id) => openOverlay({ mod: "mail", kind: "sheet", props: { sheet: name, id } });
const openThread = (th) => run("screen.open", { mod: "mail", props: { thread: th.id }, title: sender(th.from) });
const copyLink = (id) => gmail.webUrl(id).then((url) => copy(url, "Gmail link")).catch(failed);

// ---- Sending to a session ----

// The one line a session gets: enough to find the mail with gog.
const prompt = (th) => `Check the email "${th.subject || "(no subject)"}" from ${sender(th.from)}: gog gmail thread get ${th.id}`;
const hcId = (a) => a.address.split("/").pop();

// Every running agent, as the Spaces list orders them: by machine (the
// definition machine first), space and title. Sub-agents stay out.
function sessions() {
  const def = machines().find((m) => m.definition)?.name ?? null;
  const first = (m) => (m === def ? 0 : 1);
  return agents().filter((a) => a.state === "live" && !a.parent)
    .map((a) => ({ a, title: a.title || a.program?.name || a.address, where: [a.space_name, a.machine].filter(Boolean).join(" · ") }))
    .sort((x, y) => first(x.a.machine) - first(y.a.machine) || (x.a.machine ?? "").localeCompare(y.a.machine ?? "")
      || (x.a.space_name ?? "").localeCompare(y.a.space_name ?? "") || x.title.localeCompare(y.title));
}

// A snoozed session wakes first, as desktop's picker does.
async function deliver(a, text) {
  if (a.labels?.["juan.snooze"]) {
    const r = await exec("dev", ["herdr", "wake", hcId(a)], { on: a.machine });
    if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || "dev herdr wake failed");
  }
  await run("terminal.send", { terminal: a.address, text });
  await run("terminal.show", { terminal: a.address });
}

// pi in the notes space on mini, opening the space in ~/Sync/notes when it isn't open.
async function startInNotes(text) {
  const open = spaces().find((s) => s.machine === NOTES.machine && s.named && s.name === NOTES.name);
  let terminal;
  if (open) terminal = (await run("tab.new", { space: open.id, argv: ["pi", text] })).terminal;
  else {
    const r = await exec("sh", ["-c", 'cd "$HOME/$1" && pwd', "sh", NOTES.folder], { on: NOTES.machine });
    if (r.code !== 0) throw new Error(r.stderr.trim() || `no ~/${NOTES.folder} on ${NOTES.machine}`);
    terminal = (await run("space.new", { machine: NOTES.machine, name: NOTES.name, folder: r.stdout.trim(), argv: ["pi", text] })).terminal;
  }
  await run("terminal.show", { terminal });
}

// ---- Small pieces ----

function sender(from) {
  const f = from ?? "";
  return f.replace(/\s*<[^>]*>\s*$/, "").replace(/^"(.*)"$/, "$1").trim() || f.trim() || "(unknown)";
}
const address = (from) => (from ?? "").match(/<([^>]+)>\s*$/)?.[1] ?? "";
const SYSTEM_LABEL = /^(INBOX|UNREAD|IMPORTANT|STARRED|SENT|DRAFT|SPAM|TRASH|CHAT|CATEGORY_\w+|\w+_STAR)$/;
const userLabelsOf = (th) => (th?.labels ?? []).filter((l) => !SYSTEM_LABEL.test(l));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function when(date, long) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date ?? "";
  const pad = (n) => String(n).padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === new Date().toDateString()) return time;
  const day = `${MONTHS[d.getMonth()]} ${d.getDate()}${d.getFullYear() === new Date().getFullYear() ? "" : ` ${d.getFullYear()}`}`;
  return long ? `${day} ${time}` : day;
}

const PALETTE = ["ansi1", "ansi2", "ansi3", "ansi4", "ansi5", "ansi6"];
function avatar(t, name, size = 36) {
  let h = 7;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const color = t[PALETTE[h % PALETTE.length]] ?? t.accent;
  const initial = (name.match(/[A-Za-z0-9\u00C0-\u024F]/)?.[0] ?? "?").toUpperCase();
  return h_flex().size(size).flex_none().rounded_full().bg(color + "33").items_center().justify_center()
    .child(div().text_size(Math.round(size * 0.42)).font_bold().text_color(color).child(initial));
}

const chip = (t, text, color, ic) => h_flex().flex_none().gap(4).px(8).py(3).rounded_full().items_center().bg(color + "22")
  .when(Boolean(ic), (el) => el.child(icon(ic).size(13).text_color(color)))
  .child(div().text_size(12).font_semibold().text_color(color).child(text));

const spinner = (t, size = 18) => svg("icons/ui/spinner.svg").size(size).text_color(t.muted).spin(900);

const sheetRow = (t, id, title, opts = {}) =>
  h_flex().id(id).min_h(52).px(14).py(10).gap(14).rounded(10).items_center()
    .when(Boolean(opts.action), (el) => el.on_click(opts.action))
    .when(Boolean(opts.icon), (el) => el.child(icon(opts.icon).size(22).text_color(opts.danger ? t.blocked : opts.color ?? t.muted)))
    .child(v_flex().flex_1().min_w(0)
      .child(div().truncate().text_size(16).font_semibold().text_color(opts.danger ? t.blocked : t.foreground).child(title))
      .when(Boolean(opts.detail), (el) => el.child(div().mt(2).line_clamp(2).text_size(13).text_color(t.muted).child(opts.detail))))
    .when(Boolean(opts.right), (el) => el.child(opts.right));

const head = (t, over, title) => v_flex().id("head").px(14).pb(10).gap(4)
  .child(div().truncate().text_size(12).text_color(t.muted).child(over))
  .child(div().line_clamp(2).text_size(17).font_bold().text_color(t.foreground).child(title || "(no subject)"));

const field = (t, id, placeholder, f) => input(id).placeholder(placeholder).h(40).px(12).rounded(10).border(1).border_color(t.input)
  .bg(t.background).text_size(15).text_color(t.foreground).on_change(f);

// ---- The inbox ----

const inbox = {
  init(v, cx) {
    v.loading = false;
    v.error = null;
    v.warming = false;
    v.reload = (cx) => inbox.reload(v, cx);
    cx.timer.every(POLL_MS, (cx) => inbox.reload(v, cx));
    inbox.reload(v, cx);
  },
  reload(v, cx) {
    if (v.loading) return;
    v.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        setList(await gmail.listInbox());
        v.error = null;
        inbox.warm(v, cx);
      } catch (e) {
        v.error = errorText(e);
      }
      v.loading = false;
      cx.notify();
    });
  },
  // Decodes every listed thread into the cache, one at a time (gog is slower
  // in parallel), so a thread opens at once.
  warm(v, cx) {
    if (v.warming) return;
    v.warming = true;
    cx.spawn(async () => {
      const ids = new Set((list() ?? []).map((th) => th.id));
      const cached = Object.fromEntries(Object.entries(shared("mail.cached") ?? {}).filter(([id]) => ids.has(id)));
      for (const th of list() ?? []) {
        const key = gmail.keyOf(th);
        if (cached[th.id] === key) continue;
        try {
          await gmail.saveThread(th.id, key, await gmail.getThread(th.id));
          cached[th.id] = key;
        } catch (_) {
          // The thread page fetches it again and shows the error.
        }
      }
      setShared("mail.cached", cached);
      v.warming = false;
    });
  },
  row(t, th) {
    const name = sender(th.from);
    const labels = userLabelsOf(th);
    return h_flex().id(th.id).min_h(72).pl(10).pr(16).py(10).gap(10).items_center()
      .on_click(() => openThread(th))
      .on_long_press(() => sheet("actions", th.id))
      .swipe("right", { label: "Archive", color: t.done, action: () => remove(th.id, "archive") })
      .swipe("left", { label: "Trash", color: t.blocked, action: () => remove(th.id, "trash") })
      .child(div().size(8).rounded_full().bg(th.unread ? t.accent : t.background))
      .child(avatar(t, name))
      .child(v_flex().flex_1().min_w(0).gap(3)
        .child(h_flex().gap(6).items_center()
          .when(th.labels.includes("SENT"), (el) => el.child(icon("paper-plane-outline").size(13).text_color(t.dim)))
          .child(div().flex_1().min_w(0).truncate().text_size(15).text_color(th.unread ? t.foreground : t.muted).when(th.unread, (e) => e.font_semibold()).child(name))
          .when(th.labels.includes("STARRED"), (el) => el.child(icon("star").size(14).text_color(t.ansi3)))
          .child(div().flex_none().text_size(12).text_color(th.unread ? t.accent : t.dim).child(when(th.date))))
        .child(h_flex().gap(6).items_center()
          .child(div().flex_1().min_w(0).line_clamp(2).text_size(14).text_color(th.unread ? t.foreground : t.dim).child(th.subject || "(no subject)"))
          .when(th.count > 1, (el) => el.child(div().flex_none().text_size(12).text_color(t.dim).child(String(th.count)))))
        .when(labels.length > 0, (el) => el.child(h_flex().gap(6).flex_wrap().children(labels.map((l) => chip(t, l, t.ansi5, "pricetag-outline").id(l))))));
  },
  render(v, t, cx) {
    const all = list();
    const u = shared("mail.undo");
    const left = u ? UNDO_MS - (Date.now() - u.time) : 0;
    if (u && left > 0 && v.undoAt !== u.time) {
      v.undoAt = u.time;
      cx.timer.after(left, (cx) => {
        if (shared("mail.undo")?.time === u.time) setShared("mail.undo", null);
        cx.notify();
      });
    }
    const unread = (all ?? []).filter((th) => th.unread).length;
    const bottom = layout()?.root?.type === "tabs" ? 0 : safeArea().bottom;
    const bar = h_flex().id("bar").h(36).px(16).gap(8).items_center()
      .child(div().text_size(13).text_color(t.muted).child(all === null ? "Loading…" : `${all.length} in the inbox${unread ? ` · ${unread} unread` : ""}`))
      .when(v.loading, (el) => el.child(spinner(t, 14)));
    const empty = v_flex().id("empty").pt(64).items_center().gap(12)
      .child(icon("mail-open-outline").size(48).text_color(t.dim))
      .child(div().text_size(15).text_color(t.muted).child("Inbox zero"));
    return v_flex().size_full().bg(t.background)
      .child(bar)
      .when(Boolean(v.error), (el) => el.child(div().px(16).pb(8).text_size(13).text_color(t.blocked).child(v.error)))
      .child(v_flex().flex_1().overflow_y_scroll()
        .on_refresh((_e, cx) => inbox.reload(v, cx))
        .children(all !== null && all.length === 0 ? [empty] : (all ?? []).map((th) => inbox.row(t, th)))
        .child(div().id("end").h(24 + bottom)))
      .when(Boolean(u) && left > 0, (el) => el.child(h_flex().id("undo").absolute().left(12).right(12).bottom(bottom + 12).h(52).px(16).gap(12)
        .rounded(12).bg(t.raised).border(1).border_color(t.border).items_center()
        .child(div().flex_1().truncate().text_size(14).text_color(t.foreground)
          .child(`${u.kind === "archive" ? "Archived" : "Trashed"} “${u.item.subject || "(no subject)"}”`))
        .child(h_flex().id("undo-go").h(36).px(12).rounded(8).items_center().on_click(() => undo())
          .child(div().text_size(14).font_bold().text_color(t.accent).child("Undo")))));
  },
};

// ---- A thread ----

// A run of lines with columns (message.js aligns data tables with spaces):
// drawn monospaced, scrolling sideways together.
const TABLE = /\S {2,}\S/;

function textLine(t, l, i) {
  if (!l.text) return div().id(i).h(8);
  let el;
  if (l.links?.length) {
    const words = [];
    let at = 0;
    const plain = (s) => { for (const w of s.match(/\S+\s*|\s+/g) ?? []) if (w.trim() || words.length) words.push(w); };
    for (const [start, end, url] of l.links) {
      if (start > at) plain(l.text.slice(at, start));
      for (const w of l.text.slice(start, end).match(/\S+\s*/g) ?? []) {
        words.push(div().text_color(t.accent).underline().on_click(() => copy(url, "Link")).child(w));
      }
      at = end;
    }
    if (at < l.text.length) plain(l.text.slice(at));
    el = h_flex().id(i).flex_wrap().items_center().children(words);
  } else el = div().id(i).child(l.text);
  el = el.text_size(15).line_height(21).text_color(l.kind === "quote" ? t.dim : t.foreground);
  if (l.kind === "heading") el = el.font_semibold();
  if (l.kind === "quote") el = el.border_l(2).border_color(t.border).pl(8);
  return el;
}

function messageBody(v, t, rows, index) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const l = rows[i];
    if (l.kind === "header") continue;
    if (l.kind === "attachment") {
      out.push(h_flex().id(i).self_start().mt(6).gap(6).px(10).py(6).rounded(8).bg(t.raised).items_center()
        .child(icon("attach-outline").size(15).text_color(t.accent))
        .child(div().text_size(13).text_color(t.foreground).child(l.text)));
    } else if (l.kind === "quoted") {
      out.push(h_flex().id(i).self_start().my(4).gap(6).px(10).h(32).rounded(8).bg(t.raised).items_center()
        .on_click((_e, cx) => v.toggle(`q${index}`, cx))
        .child(div().text_size(14).font_bold().text_color(t.muted).child("···"))
        .child(div().text_size(13).text_color(t.muted).child(l.text)));
    } else if (l.kind !== "quote" && TABLE.test(l.text) && !l.links?.length) {
      const block = [];
      while (i < rows.length && rows[i].kind === l.kind && TABLE.test(rows[i].text) && !rows[i].links?.length) block.push(rows[i++]);
      i--;
      out.push(div().id(`tb${i}`).overflow_x_scroll().child(v_flex().py(4).children(block.map((r, k) =>
        div().id(k).whitespace_nowrap().font_mono().text_size(12).line_height(18).text_color(t.foreground).child(r.text)))));
    } else out.push(textLine(t, l, i));
  }
  return out;
}

const threadPage = {
  init(v, cx) {
    v.id = props().thread;
    v.thread = null;
    v.open = new Set();
    v.reload = (cx) => threadPage.load(v, cx, true);
    threadPage.load(v, cx, false);
  },
  load(v, cx, fresh) {
    if (v.loading) return;
    v.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const th = itemOf(v.id);
        const key = th ? gmail.keyOf(th) : null;
        let thread = !fresh && key ? await gmail.cachedThread(v.id, key) : null;
        if (!thread) {
          thread = await gmail.getThread(v.id);
          if (key) {
            gmail.saveThread(v.id, key, thread);
            setShared("mail.cached", { ...(shared("mail.cached") ?? {}), [v.id]: key });
          }
        }
        if (!v.thread) v.open = new Set([thread.messages.length - 1]);
        v.thread = thread;
        v.error = null;
      } catch (e) {
        v.error = errorText(e);
      }
      v.loading = false;
      v.ver = (v.ver ?? 0) + 1;
      cx.notify();
    });
  },
  message(v, t, thread, rows, i) {
    const m = thread.messages[i];
    const name = sender(m.from);
    const open = v.open.has(i);
    const only = thread.messages.length === 1;
    const top = h_flex().id("who").gap(10).items_center()
      .when(!only, (el) => el.on_click((_e, cx) => {
        if (open) v.open.delete(i);
        else v.open.add(i);
        v.ver = (v.ver ?? 0) + 1;
        cx.notify();
      }))
      .child(avatar(t, name, 34))
      .child(v_flex().flex_1().min_w(0)
        .child(div().truncate().text_size(15).font_semibold().text_color(t.foreground).child(name))
        .child(div().truncate().text_size(12).text_color(t.dim).child(open ? address(m.from) || " " : (m.text ?? "").replace(/\s+/g, " ").trim().slice(0, 120) || " ")))
      .child(div().flex_none().text_size(12).text_color(t.dim).child(when(m.date, true)));
    return v_flex().id(`m${i}`).mx(12).mb(10).px(14).py(12).gap(10).rounded(12).bg(open ? t.surface : t.background)
      .border(1).border_color(t.border)
      .child(top)
      .when(open, (el) => el.children(messageBody(v, t, rows.filter((l) => l.message === i), i)));
  },
  render(v, t) {
    const th = itemOf(v.id);
    const thread = v.thread;
    if (!thread) {
      return v_flex().size_full().bg(t.background).items_center().pt(80).gap(14).px(24)
        .child(v.error ? icon("cloud-offline-outline").size(40).text_color(t.blocked) : spinner(t, 28))
        .when(Boolean(v.error), (el) => el
          .child(div().text_size(14).text_center().text_color(t.muted).child(v.error))
          .child(h_flex().id("retry").h(44).px(16).rounded(10).bg(t.raised).items_center().on_click((_e, cx) => v.reload(cx))
            .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Try again"))));
    }
    const labels = userLabelsOf(th);
    const files = thread.messages.reduce((n, m) => n + m.attachments.length, 0);
    const quotes = new Set(thread.messages.map((_, i) => i).filter((i) => v.expanded.has(`q${i}`)));
    const body = v.memo([thread, t, v.loading, labels.join(","), th?.labels.includes("STARRED"), [...quotes].join(",")], () => {
      const rows = lines(thread, 100000, quotes);
      return v_flex()
        .child(v_flex().id("title").px(16).pt(14).pb(12).gap(10)
          .child(h_flex().gap(8).items_center()
            .child(div().flex_1().text_size(20).font_bold().line_height(26).text_color(t.foreground).child(thread.subject))
            .when(v.loading, (el) => el.child(spinner(t, 16))))
          .child(h_flex().id("chips").flex_wrap().gap(6).items_center()
            .when(thread.messages.length > 1, (el) => el.child(chip(t, `${thread.messages.length} messages`, t.muted, "chatbubbles-outline")))
            .when(Boolean(th?.labels.includes("STARRED")), (el) => el.child(chip(t, "Starred", t.ansi3, "star")))
            .when(files > 0, (el) => el.child(chip(t, files > 1 ? `${files} attachments` : "1 attachment", t.muted, "attach-outline")))
            .children(labels.map((l) => chip(t, l, t.ansi5, "pricetag-outline").id(l).on_click(() => sheet("labels", v.id))))))
        .children(thread.messages.map((_, i) => threadPage.message(v, t, thread, rows, i)));
    });
    const button = (id, text, ic, action, color) => h_flex().id(id).flex_1().min_h(44).gap(6).rounded(10).bg(t.raised).items_center().justify_center()
      .on_click(action)
      .child(icon(ic).size(18).text_color(color ?? t.foreground))
      .when(Boolean(text), (el) => el.child(div().text_size(14).font_semibold().text_color(t.foreground).child(text)));
    const inInbox = Boolean(th);
    return v_flex().size_full().bg(t.background)
      .child(v_flex().flex_1().overflow_y_scroll().on_refresh((_e, cx) => v.reload(cx))
        .when(Boolean(v.error), (el) => el.child(div().id("err").mx(12).mt(8).p(10).rounded(8).bg(t.blocked + "22").text_size(13).text_color(t.blocked).child(v.error)))
        .child(body)
        .child(div().id("end").h(32)))
      .child(h_flex().id("bar").px(12).pt(10).pb(10 + safeArea().bottom).gap(8).bg(t.chrome).border_t(1).border_color(t.border)
        .when(inInbox, (el) => el
          .child(button("archive", "Archive", "archive-outline", () => { remove(v.id, "archive"); run("screen.back"); }, t.done))
          .child(button("trash", null, "trash-outline", () => { remove(v.id, "trash"); run("screen.back"); }, t.blocked))
          .child(button("labels", null, "pricetag-outline", () => sheet("labels", v.id))))
        .child(button("route", "Send", "sparkles-outline", () => sheet("route", v.id), t.accent))
        .child(button("link", null, "link-outline", () => copyLink(v.id))));
  },
};

// ---- Sheets ----

const closeSheet = () => closeOverlay(props().overlay);
const then = (f) => () => { closeSheet(); f(); };

const actions = {
  render(_v, t) {
    const th = itemOf(props().id);
    if (!th) return v_flex().w_full().p(16).child(div().text_size(15).text_color(t.muted).child("This thread left the inbox."));
    return v_flex().w_full().px(4).pb(8)
      .child(head(t, sender(th.from), th.subject))
      .child(sheetRow(t, "open", "Open", { icon: "open-outline", action: then(() => openThread(th)) }))
      .child(sheetRow(t, "route", "Send to a session", { icon: "sparkles-outline", color: t.accent, detail: "A running agent, or pi in your notes", action: then(() => sheet("route", th.id)) }))
      .child(sheetRow(t, "labels", "Labels", { icon: "pricetag-outline", detail: userLabelsOf(th).join(", ") || "None", action: then(() => sheet("labels", th.id)) }))
      .child(sheetRow(t, "link", "Copy Gmail link", { icon: "link-outline", action: then(() => copyLink(th.id)) }))
      .child(sheetRow(t, "archive", "Archive", { icon: "archive-outline", color: t.done, detail: "Out of the inbox, and marked read", action: then(() => remove(th.id, "archive")) }))
      .child(sheetRow(t, "trash", "Trash", { icon: "trash-outline", danger: true, action: then(() => remove(th.id, "trash")) }));
  },
};

// The field sits at the top: a sheet doesn't shrink for the keyboard.
const labelsSheet = {
  init(v, cx) {
    v.query = "";
    v.labels = shared("mail.labels") ?? null;
    // The labels applied when the sheet opens come first, and stay where
    // they are while you add and remove labels.
    v.applied = new Set(itemOf(props().id)?.labels ?? []);
    cx.spawn(async (cx) => {
      try {
        v.labels = await gmail.userLabels();
        setShared("mail.labels", v.labels);
      } catch (e) {
        if (!v.labels) v.error = errorText(e);
      }
      cx.notify();
    });
  },
  render(v, t) {
    const th = itemOf(props().id);
    if (!th) return v_flex().w_full().p(16).child(div().text_size(15).text_color(t.muted).child("This thread left the inbox."));
    const q = v.query.trim().toLowerCase();
    const shown = [...(v.labels ?? [])].sort((a, b) => v.applied.has(b) - v.applied.has(a)).filter((l) => !q || l.toLowerCase().includes(q));
    return v_flex().w_full().h(520).px(4).pb(8)
      .child(head(t, "Label as", th.subject))
      .child(v_flex().px(14).pb(6).gap(6)
        .child(field(t, "q", "Filter labels", (e, cx) => { v.query = e.text; cx.notify(); }))
        .when(Boolean(v.error), (el) => el.child(div().text_size(13).text_color(t.blocked).child(v.error))))
      .child(v_flex().id("labels").flex_1().overflow_y_scroll()
        .when(v.labels === null && !v.error, (el) => el.child(h_flex().id("loading").px(14).py(12).child(spinner(t))))
        .children(shown.map((l) => {
          const on = th.labels.includes(l);
          return h_flex().id(l).min_h(48).px(14).gap(12).items_center().rounded(10)
            .on_click(() => toggleLabel(th.id, l))
            .child(icon(on ? "checkbox" : "square-outline").size(22).text_color(on ? t.ansi5 : t.muted))
            .child(div().flex_1().truncate().text_size(15).text_color(on ? t.foreground : t.muted).child(l));
        }))
        .when(v.labels !== null && shown.length === 0, (el) => el.child(div().id("none").px(14).py(10).text_size(14).text_color(t.muted).child("No label matches.")))
        .child(div().id("end").h(16)));
  },
};

const routeSheet = {
  init(v) {
    v.query = "";
    v.busy = false;
  },
  render(v, t) {
    const th = itemOf(props().id);
    if (!th) return v_flex().w_full().p(16).child(div().text_size(15).text_color(t.muted).child("This thread left the inbox."));
    const text = prompt(th);
    const q = v.query.trim().toLowerCase();
    const go = (f, title) => (_e, cx) => {
      if (v.busy) return;
      v.busy = true;
      cx.notify();
      closeSheet();
      f().then(() => notify({ title, level: "success" })).catch((e) => notify({ title: "Could not send it", body: errorText(e), level: "error" }));
    };
    const rows = sessions().filter((s) => !q || `${s.title} ${s.where}`.toLowerCase().includes(q)).map(({ a, title, where }) => {
      const snoozed = Boolean(a.labels?.["juan.snooze"]);
      return sheetRow(t, a.address, title, {
        icon: "ellipse", color: snoozed ? t.dim : t[a.status] ?? t.muted, detail: `${where}${snoozed ? " · snoozed" : ""}`,
        action: a.status === "blocked"
          ? (_e, cx) => { v.error = `${title} needs you first. Answer it, then send.`; cx.notify(); }
          : go(() => deliver(a, text), `Sent to ${title}`),
      });
    });
    return v_flex().w_full().h(560).px(4).pb(8)
      .child(head(t, `Send “${th.subject || "(no subject)"}”`, text))
      .child(v_flex().px(14).pb(6).gap(6)
        .child(field(t, "q", "Filter sessions", (e, cx) => { v.query = e.text; cx.notify(); }))
        .when(Boolean(v.error), (el) => el.child(div().text_size(13).text_color(t.blocked).child(v.error))))
      .child(v_flex().id("targets").flex_1().overflow_y_scroll()
        .child(sheetRow(t, "notes", "New session in notes", { icon: "add-circle-outline", color: t.accent, detail: `pi on ${NOTES.machine}, in ~/${NOTES.folder}`, action: go(() => startInNotes(text), "Started pi in notes") }))
        .children(rows)
        .when(rows.length === 0 && Boolean(q), (el) => el.child(div().id("none").px(14).py(10).text_size(14).text_color(t.muted).child("No session matches.")))
        .child(div().id("end").h(16)));
  },
};

const SHEETS = { actions, labels: labelsSheet, route: routeSheet };

export default class Mail extends View {
  init(_props, cx) {
    const p = props();
    this.f = p.sheet ? SHEETS[p.sheet] : p.thread ? threadPage : inbox;
    if (!this.f) throw new Error(`no mail sheet called ${p.sheet}`);
    this.expanded = new Set();
    this.toggle = (key, cx) => {
      if (this.expanded.has(key)) this.expanded.delete(key);
      else this.expanded.add(key);
      cx.notify();
    };
    this.f.init?.(this, cx);
  }

  /** Reuses the last tree while deps hold: the app draws again on every agent change. */
  memo(deps, build) {
    const d = [...deps, this.ver];
    if (this.memoDeps && d.length === this.memoDeps.length && d.every((x, i) => x === this.memoDeps[i])) return this.memoEl;
    this.memoDeps = d;
    this.memoEl = build();
    return this.memoEl;
  }

  render(cx) {
    return this.f.render(this, theme(), cx);
  }
}
