// The Gmail inbox in a dialog: threads on the left, the selected thread's
// messages on the right, browsed with vim keys. Read-only: nothing here
// changes Gmail. KEYS is the list of what every key does; the footer and the
// ? sheet are drawn from it.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, ScrollHandle, Scrollbar, v_virtual_list, VirtualListScrollHandle, InputState, Input } from "gpui-base";
import { exec, run, theme, props, closeOverlay, openOverlay, shared, setShared, settings, spaces } from "herdr";
import * as gmail from "./gmail.js";
import { lines } from "./message.js";
import { pickerRows, settle, move as movePick, renderPicker, deliver, PickerSearch, pickerKey } from "./session-picker.js";

const COLS = 78;
const SCROLL_LINES = 3;
const CACHE_VERSION = 3;
const keyOf = (th) => `${CACHE_VERSION}|${th.count}|${th.date}`;
const ROW = 21;
const HEADER = 64;
const COLUMN = 680;

const KEYS = [
  { keys: ["j", "down"], label: "next thread", group: "Move", act: "next", footer: true },
  { keys: ["k", "up"], label: "previous thread", group: "Move", act: "prev" },
  { keys: ["J"], label: "scroll down", group: "Read", act: "lineDown", footer: true },
  { keys: ["K"], label: "scroll up", group: "Read", act: "lineUp" },
  { keys: ["ctrl-d"], label: "half page down", group: "Read", act: "down" },
  { keys: ["ctrl-u"], label: "half page up", group: "Read", act: "up" },
  { keys: [">", "right"], label: "older message", group: "Read", act: "prevMessage", footer: true },
  { keys: ["<", "left"], label: "newer message", group: "Read", act: "nextMessage" },
  { keys: ["."], label: "show quoted text", group: "Read", act: "quotes" },
  { keys: ["e"], label: "archive", group: "Triage", act: "archive", footer: true },
  { keys: ["#"], label: "trash", group: "Triage", act: "trash", footer: true },
  { keys: ["l"], label: "labels", group: "Triage", act: "labels", footer: true },
  { keys: ["z"], label: "undo", group: "Triage", act: "undo" },
  { keys: ["p"], label: "send to a session", group: "Go", act: "route", footer: true },
  { keys: ["o", "enter"], label: "open in Gmail", group: "Go", act: "open", footer: true },
  { keys: ["ctrl-r"], label: "reload", group: "Other", act: "reload" },
  { keys: ["?"], label: "all keys", group: "Other", act: "help", footer: true },
  { keys: ["q", "escape"], label: "close", group: "Other", act: "close" },
];
const KEY_LABEL = { down: "↓", up: "↑", left: "←", right: "→", enter: "↵", escape: "Esc", "ctrl-r": "⌃R", "ctrl-d": "⌃D", "ctrl-u": "⌃U" };

function keyName(e) {
  const m = e.modifiers ?? {};
  if (m.control) return `ctrl-${e.key}`;
  if (m.platform) return `cmd-${e.key}`;
  if (["down", "up", "left", "right", "enter", "escape"].includes(e.key)) return e.key;
  return e.key_char || e.key;
}

const errorText = (e) => String(e?.message ?? e);
const sender = (from) => from.replace(/\s*<[^>]*>\s*$/, "").replace(/^"(.*)"$/, "$1") || from;
const address = (from) => from.match(/<([^>]+)>\s*$/)?.[1] ?? "";
const AVATAR_COLORS = ["ansi1", "ansi2", "ansi3", "ansi4", "ansi5", "ansi6"];

const SYSTEM_LABEL = /^(INBOX|UNREAD|IMPORTANT|STARRED|SENT|DRAFT|SPAM|TRASH|CHAT|CATEGORY_\w+|\w+_STAR)$/;
const ICON = (name) => `icons-juan/mail-${name}.svg`;
const icon = (name, color, size = 14) => svg(ICON(name)).size(size).flex_none().text_color(color);

const pill = (t, text, color, iconName) => h_flex().flex_none().gap(4).px(7).h(20).rounded(10).items_center()
  .bg(t.raised).text_size(11).text_color(color)
  .when(!!iconName, (el) => el.child(icon(iconName, color, 11)))
  .child(text);

function avatar(t, name, size = 32) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const initial = (name.match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();
  return div().flex_none().size(size).rounded_full().bg(t[AVATAR_COLORS[h % AVATAR_COLORS.length]] ?? t.accent)
    .flex().items_center().justify_center().text_size(size * 0.42).font_semibold().text_color(t.background).child(initial);
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function when(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const pad = (n) => String(n).padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === new Date().toDateString()) return time;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${d.getFullYear() === new Date().getFullYear() ? "" : ` ${d.getFullYear()}`} ${time}`;
}

export default class Mail extends View {
  init(_props, cx) {
    this.list = shared("mail.list") ?? [];
    this.selId = this.list[0]?.id ?? null;
    this.bodies = {}; // thread id → { key, thread, lines: Line[][] (one list per message) } | { error }
    this.msg = 0; // the shown message of the shown thread
    this.expanded = {}; // thread id → Set of message indexes showing their quoted text
    this.queue = []; // thread ids to fetch, the selected one first
    this.working = false;
    this.shownId = null;
    this.listError = null;
    this.loading = false;
    this.help = false;
    this.top = 0;
    this.page = 0;
    this.note = null; // { text, level } in the footer until the next key
    this.undo = null; // { item, at, kind } of the last archive or trash
    this.labels = shared("mail.labels") ?? null; // every user label name
    this.picker = null; // { at } while the label picker is open
    this.route = null; // { at } while the session picker is open
    this.routeScroll = ScrollHandle.new();
    this.labelQuery = InputState.new({ placeholder: "Label as…" });
    this.labelQuery.on("change", (_e, cx) => { if (this.picker) this.picker.at = 0; cx.notify(); });
    this.labelQuery.on("submit", (_e, cx) => this.toggleLabel(cx));
    this.handle = cx.focus_handle();
    this.routeSearch = new PickerSearch(this.handle, {
      onChange: (_e, cx) => { if (this.route) this.route.at = -1; cx.notify(); },
      onSubmit: (_e, cx) => this.pickSession(cx),
    });
    this.listScroll = ScrollHandle.new();
    this.pickerScroll = ScrollHandle.new();
    this.bodyScroll = VirtualListScrollHandle.new();
    cx.timer.after(0, () => this.handle.focus());
    this.warm(cx);
    this.reload(cx);
  }

  // ---- Gmail ----

  reload(cx) {
    if (this.loading) return;
    this.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        this.list = (await gmail.listInbox()).map((th) => ({
          id: th.id, from: th.from, subject: th.subject, date: th.internalDateIso || th.date,
          unread: th.labels?.includes("UNREAD") ?? false, count: th.messageCount ?? 1, labels: th.labels ?? [],
        }));
        this.listError = null;
        setShared("mail.list", this.list);
        if (!this.list.some((th) => th.id === this.selId)) this.select(cx, this.list[0]?.id ?? null);
        this.warm(cx);
      } catch (e) {
        this.listError = errorText(e);
      }
      this.loading = false;
      cx.notify();
    });
  }

  item(id) {
    return this.list.find((th) => th.id === id);
  }

  fresh(id) {
    const b = this.bodies[id];
    const th = this.item(id);
    return Boolean(b?.thread && th && b.key === keyOf(th));
  }

  remember(cx, id, key, thread) {
    this.bodies[id] = { key, thread };
    this.relayout(id);
    if (this.selId === id && this.shownId !== id) this.show(cx, id);
  }

  relayout(id) {
    const body = this.bodies[id];
    const all = lines(body.thread, COLS, this.expanded[id] ?? new Set());
    body.lines = body.thread.messages.map((_, i) => all.filter((l) => l.message === i));
  }

  toggleQuotes() {
    const id = this.shownId;
    if (!this.bodies[id]?.thread) return;
    const set = (this.expanded[id] ??= new Set());
    if (set.has(this.msg)) set.delete(this.msg);
    else set.add(this.msg);
    this.relayout(id);
  }

  // Reads every listed thread from the disk cache, then fetches the rest.
  warm(cx) {
    const missing = this.list.filter((th) => !this.fresh(th.id));
    cx.spawn(async (cx) => {
      await Promise.all(missing.map(async (th) => {
        const thread = await gmail.cachedThread(th.id, keyOf(th));
        if (thread && !this.fresh(th.id)) this.remember(cx, th.id, keyOf(th), thread);
      }));
      cx.notify();
      const sel = this.list.filter((th) => th.id === this.selId);
      for (const th of [...sel, ...this.list]) if (!this.fresh(th.id) && !this.queue.includes(th.id)) this.queue.push(th.id);
      this.pump(cx);
    });
  }

  // Fetches queued threads one at a time: gog is slower when run in parallel.
  pump(cx) {
    if (this.working) return;
    this.working = true;
    cx.spawn(async (cx) => {
      for (let id; (id = this.queue.shift()); ) {
        const th = this.item(id);
        if (!th || this.fresh(id)) continue;
        const key = keyOf(th);
        try {
          const thread = await gmail.getThread(id);
          this.remember(cx, id, key, thread);
          gmail.saveThread(id, key, thread);
        } catch (e) {
          if (!this.bodies[id]?.thread) this.bodies[id] = { error: errorText(e) };
        }
        cx.notify();
      }
      this.working = false;
    });
  }

  // Shows a loaded thread's newest message.
  show(cx, id) {
    this.shownId = id;
    this.showMessage((this.bodies[id]?.thread?.messages.length ?? 1) - 1);
  }

  showMessage(i) {
    this.msg = i;
    this.top = 0;
    this.range = null;
    this.bodyScroll.scroll_to_item(0, "top");
  }

  rows() {
    return this.bodies[this.shownId]?.lines?.[this.msg] ?? [];
  }

  // Puts row i at the top of the reading pane. scroll_to_item leaves a visible
  // row where it is and brings a hidden one to the nearest edge, so a row below
  // the view is reached by bringing the row a page further down to the bottom.
  toTop(cx, i) {
    const rows = this.rows();
    if (!rows.length) return;
    i = Math.max(0, Math.min(rows.length - 1, i));
    const size = (n) => (rows[n].kind === "header" ? HEADER : ROW);
    if (i <= this.top) this.bodyScroll.scroll_to_item(i, "top");
    else if (this.range && this.range.end - this.range.start > 1) {
      let height = -ROW;
      for (let n = this.range.start; n < Math.min(this.range.end, rows.length); n++) height += size(n);
      let last = i;
      for (let used = size(i); last + 1 < rows.length && used + size(last + 1) <= height; ) used += size(++last);
      this.bodyScroll.scroll_to_item(last);
    } else {
      this.bodyScroll.scroll_to_item(rows.length - 1);
      cx.timer.after(30, () => this.bodyScroll.scroll_to_item(i, "top"));
    }
    this.top = i;
  }

  // ---- Selection ----

  index() {
    return this.list.findIndex((th) => th.id === this.selId);
  }

  select(cx, id) {
    this.selId = id;
    const i = this.index();
    if (i >= 0) this.listScroll.scroll_to_item(i);
    if (id && this.bodies[id]?.thread) this.show(cx, id);
    if (id && !this.fresh(id)) {
      this.queue = [id, ...this.queue.filter((x) => x !== id)];
      this.pump(cx);
    }
    cx.notify();
  }

  move(cx, to) {
    if (!this.list.length) return;
    this.select(cx, this.list[Math.max(0, Math.min(this.list.length - 1, to))].id);
  }

  scrollBody(cx, by) {
    const rows = this.rows();
    if (!rows.length) return;
    this.toTop(cx, Math.min(Math.max(0, rows.length - this.page + 1), this.top + by));
  }

  jumpMessage(delta) {
    const count = this.bodies[this.shownId]?.thread?.messages.length ?? 0;
    const to = this.msg + delta;
    if (to >= 0 && to < count) this.showMessage(to);
  }

  // ---- Triage ----

  flash(cx, text, level = "info") {
    this.note = { text, level };
    cx.notify();
  }

  // Takes the selected thread out of the list at once, selects the next one,
  // and puts it back if Gmail refuses.
  remove(cx, kind) {
    const at = this.index();
    const item = this.list[at];
    if (!item) return;
    const change = kind === "archive" ? { remove: ["INBOX", "UNREAD"] } : { add: ["TRASH"], remove: ["INBOX"] };
    this.list = this.list.filter((th) => th.id !== item.id);
    setShared("mail.list", this.list);
    this.undo = { item, at, kind };
    this.select(cx, this.list[Math.min(at, this.list.length - 1)]?.id ?? null);
    this.flash(cx, kind === "archive" ? "Archived · z undoes" : "Moved to trash · z undoes", "success");
    cx.spawn(async (cx) => {
      try {
        await gmail.modify(item.id, change);
      } catch (e) {
        this.putBack(cx, item, at);
        this.flash(cx, errorText(e), "error");
      }
    });
  }

  putBack(cx, item, at) {
    if (this.list.some((th) => th.id === item.id)) return;
    this.list = [...this.list.slice(0, at), item, ...this.list.slice(at)];
    setShared("mail.list", this.list);
    this.select(cx, item.id);
  }

  undoLast(cx) {
    const u = this.undo;
    if (!u) return this.flash(cx, "Nothing to undo");
    this.undo = null;
    this.putBack(cx, u.item, u.at);
    this.flash(cx, u.kind === "archive" ? "Back in the inbox" : "Back from the trash", "success");
    const change = u.kind === "archive" ? { add: u.item.unread ? ["INBOX", "UNREAD"] : ["INBOX"] } : { add: ["INBOX"], remove: ["TRASH"] };
    cx.spawn(async (cx) => {
      try {
        await gmail.modify(u.item.id, change);
      } catch (e) {
        this.flash(cx, errorText(e), "error");
      }
    });
  }

  openPicker(cx) {
    const item = this.list[this.index()];
    if (!item) return;
    // The labels applied when the picker opens come first, and stay where
    // they are while you add and remove labels.
    this.picker = { at: 0, applied: new Set(item.labels) };
    this.labelQuery.set_value("");
    this.labelQuery.focus();
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        this.labels = await gmail.userLabels();
        setShared("mail.labels", this.labels);
      } catch (e) {
        if (!this.labels) this.flash(cx, errorText(e), "error");
      }
      cx.notify();
    });
  }

  closePicker(cx) {
    this.picker = null;
    this.handle.focus();
    cx.notify();
  }

  pickerList() {
    const q = this.labelQuery.value().trim().toLowerCase();
    const applied = this.picker?.applied ?? new Set();
    const all = [...(this.labels ?? [])].sort((a, b) => applied.has(b) - applied.has(a));
    return q ? all.filter((l) => l.toLowerCase().includes(q)) : all;
  }

  toggleLabel(cx) {
    const item = this.list[this.index()];
    const label = this.pickerList()[this.picker?.at ?? 0];
    if (!item || !label) return;
    const has = item.labels.includes(label);
    item.labels = has ? item.labels.filter((l) => l !== label) : [...item.labels, label];
    setShared("mail.list", this.list);
    this.flash(cx, has ? `Removed ${label}` : `Labelled ${label}`, "success");
    cx.spawn(async (cx) => {
      try {
        await gmail.modify(item.id, has ? { remove: [label] } : { add: [label] });
      } catch (e) {
        item.labels = has ? [...item.labels, label] : item.labels.filter((l) => l !== label);
        this.flash(cx, errorText(e), "error");
      }
    });
  }

  // ---- Sending to a session ----

  // The one line a session gets: enough to find the mail with gog.
  prompt(item) {
    return `Check the email "${item.subject || "(no subject)"}" from ${sender(item.from)}: gog gmail thread get ${item.id}`;
  }

  // New sessions start in the notes space, where mail gets handled, or in the active space.
  starts() {
    const all = spaces();
    const notes = all.find((s) => s.id === shared("notes.space"));
    const active = all.find((s) => s.active);
    return [notes, active && active.id !== notes?.id ? active : null].filter(Boolean)
      .map((s) => ({ title: `New session in ${s.name}`, detail: s.machine ?? "", value: s }));
  }

  routeRows() {
    const rows = pickerRows(this.starts(), this.routeSearch.value());
    if (this.route.at < 0 || !rows[this.route.at]) {
      this.route.at = settle(rows);
      this.routeScroll.scroll_to_item(Math.max(0, this.route.at));
    }
    return rows;
  }

  openRoute(cx) {
    if (!this.list[this.index()]) return;
    this.route = { at: -1 };
    this.routeSearch.reset();
    cx.notify();
  }

  pickSession(cx, i = this.route?.at) {
    const item = this.list[this.index()];
    const row = this.routeRows()[i];
    if (!item || !row || (row.kind !== "session" && row.kind !== "start")) return;
    const text = this.prompt(item);
    this.route = null;
    this.routeSearch.reset();
    // Once the session has the mail, the dialog closes and the session shows.
    if (row.kind === "start") {
      const s = row.value;
      openOverlay({ mod: "new-pi", props: { space: s.id, folder: s.folder, task: text }, kind: "popup", width: 1, height: 1, frame: "none" });
      return closeOverlay(props().overlay);
    }
    if (row.agent.status === "blocked") return this.flash(cx, `${row.name} needs you first: answer it, then send`, "error");
    this.flash(cx, `Sending to ${row.name}…`);
    cx.spawn(async (cx) => {
      try {
        await deliver(row, text);
        run("pane.focus", { pane: row.agent.pane });
        closeOverlay(props().overlay);
      } catch (e) {
        this.flash(cx, errorText(e), "error");
      }
    });
  }

  // ---- Keys ----

  // Escape is Herdr's overlay.close binding, which runs before key handlers.
  // While the session or label picker or the help sheet is open, the root takes
  // that action and goes back one step (out of the session search first);
  // otherwise it reaches the dialog and closes it.
  back(cx) {
    if (this.route && this.routeSearch.stop()) cx.notify();
    else if (this.route) { this.route = null; cx.notify(); }
    else if (this.picker) this.closePicker(cx);
    else if (this.help) { this.help = false; cx.notify(); }
  }

  key(e, cx) {
    if (this.help) {
      cx.stop_propagation();
      this.help = false;
      return cx.notify();
    }
    const k = keyName(e);
    if (this.route) {
      if (this.routeSearch.active && !pickerKey(this.routeSearch, k).move) return;
      cx.stop_propagation();
      const act = pickerKey(this.routeSearch, k);
      if (act.search) this.routeSearch.start();
      else if (act.pick) return this.pickSession(cx);
      else if (act.move) {
        this.route.at = movePick(this.routeRows(), this.route.at, act.move);
        this.routeScroll.scroll_to_item(this.route.at);
      } else return;
      return cx.notify();
    }
    if (this.picker) {
      const n = this.pickerList().length || 1;
      if (k === "down" || k === "ctrl-n") { this.picker.at = (this.picker.at + 1) % n; cx.notify(); }
      else if (k === "up" || k === "ctrl-p") { this.picker.at = (this.picker.at + n - 1) % n; cx.notify(); }
      else return;
      return cx.stop_propagation();
    }
    const entry = KEYS.find((x) => x.keys.includes(k));
    if (!entry) return;
    cx.stop_propagation();
    this.note = null;
    const i = this.index();
    switch (entry.act) {
      case "next": return this.move(cx, i + 1);
      case "prev": return this.move(cx, i - 1);
      case "archive": return this.remove(cx, "archive");
      case "trash": return this.remove(cx, "trash");
      case "undo": return this.undoLast(cx);
      case "labels": return this.openPicker(cx);
      case "route": return this.openRoute(cx);
      case "lineDown": this.scrollBody(cx, SCROLL_LINES); return cx.notify();
      case "lineUp": this.scrollBody(cx, -SCROLL_LINES); return cx.notify();
      case "down": this.scrollBody(cx, Math.max(1, Math.floor(this.page / 2))); return cx.notify();
      case "up": this.scrollBody(cx, -Math.max(1, Math.floor(this.page / 2))); return cx.notify();
      case "nextMessage": this.jumpMessage(1); return cx.notify();
      case "prevMessage": this.jumpMessage(-1); return cx.notify();
      case "open": {
        const id = this.selId;
        if (id) gmail.webUrl(id).then((url) => exec("open", [url])).catch(() => {});
        return;
      }
      case "quotes": this.toggleQuotes(); return cx.notify();
      case "reload": return this.reload(cx);
      case "help": this.help = true; return cx.notify();
      case "close": return closeOverlay(props().overlay);
    }
  }

  // ---- Drawing ----

  keyChip(t, k) {
    return div().flex_none().px(5).h(18).rounded(4).bg(t.raised).text_color(t.foreground).text_size(11).flex().items_center().child(KEY_LABEL[k] ?? k);
  }

  renderList(t) {
    const rows = this.list.map((th) => {
      const on = th.id === this.selId;
      const labels = th.labels ?? [];
            const name = div().flex_1().min_w(0).truncate().text_color(on || th.unread ? t.foreground : t.muted).child(sender(th.from));
      return h_flex().id(`th-${th.id}`).flex_none().gap(10).pl(10).pr(12).py(10).rounded(8).items_start()
        .border_l_2().border_color(on ? t.accent : t.popover)
        .when(on, (el) => el.bg(t.raised))
        .on_click((_e, cx) => { this.select(cx, th.id); this.handle.focus(); })
        .child(div().flex_none().mt(1).child(icon("mail", th.unread || on ? t.accent : t.dim, 15)))
        .child(v_flex().flex_1().min_w(0).gap(3)
          .child(h_flex().gap(6).items_center()
            .when(labels.includes("SENT"), (el) => el.child(icon("paper-airplane", t.dim, 11)))
            .child(th.unread ? name.font_semibold() : name)
            .when(labels.includes("STARRED"), (el) => el.child(icon("star-fill", t.ansi3, 12)))
            .child(div().flex_none().text_size(11).text_color(th.unread ? t.accent : t.dim).child(when(th.date))))
          .child(h_flex().gap(6).items_center()
            .child(div().flex_1().min_w(0).truncate().text_size(12).text_color(on || th.unread ? t.muted : t.dim).child(th.subject || "(no subject)"))
            .when(th.count > 1, (el) => el.child(h_flex().flex_none().gap(3).items_center().text_size(11).text_color(t.dim)
              .child(icon("reply", t.dim, 11)).child(String(th.count))))))
        .when(th.unread, (el) => el.child(div().flex_none().mt(5).size(7).rounded_full().bg(t.accent)));
    });
    return v_flex().id("mail-list").w(340).flex_none().h_full().gap(2).overflow_y_scrollbar().track_scroll(this.listScroll).children(rows);
  }

  renderBody(t, body) {
    const font = settings().font;
    const { thread } = body;
    const rows = body.lines[this.msg] ?? [];
    const column = (el) => h_flex().w_full().justify_center().child(el.w_full().max_w(COLUMN));
    const row = (l) => {
      if (l.kind === "header") {
        const m = thread.messages[l.message];
        const name = sender(m.from);
        return column(h_flex().h(HEADER).items_center().gap(12).pt(12)
          .child(avatar(t, name))
          .child(v_flex().flex_1().min_w(0).gap(1)
            .child(h_flex().gap(8).items_center()
              .child(div().truncate().font_semibold().text_color(t.foreground).child(name))
              .when(m.unread, (el) => el.child(div().flex_none().size(7).rounded_full().bg(t.accent))))
            .child(div().truncate().text_size(11.5).text_color(t.dim).child(address(m.from) || " ")))
          .child(div().flex_none().text_size(11.5).text_color(t.dim).child(when(m.date))));
      }
      const base = div().h(ROW).flex().items_center().whitespace_nowrap().overflow_hidden();
      if (l.kind === "attachment") {
        return column(base.child(h_flex().gap(6).px(8).h(ROW - 3).rounded(5).bg(t.raised).items_center().text_size(12).text_color(t.foreground)
          .child(icon("paperclip", t.accent, 12)).child(l.text)));
      }
      if (l.kind === "quoted") {
        return column(base.child(h_flex().gap(6).px(8).h(ROW - 3).rounded(5).bg(t.raised).items_center()
          .text_size(11.5).text_color(t.muted)
          .child(div().font_semibold().child("···")).child(l.text).child(div().text_color(t.dim).child("."))));
      }
      const color = l.kind === "quote" ? t.dim : t.foreground;
      let el = base.text_color(color);
      if (l.kind === "heading") el = el.font_semibold();
      if (l.kind === "quote") el = el.border_l_2().border_color(t.border).pl(8);
      if (l.links?.length) {
        const parts = [];
        let at = 0;
        for (const [start, end] of l.links) {
          if (start > at) parts.push(div().child(l.text.slice(at, start)));
          parts.push(div().text_color(t.accent).underline().child(l.text.slice(start, end)));
          at = end;
        }
        if (at < l.text.length) parts.push(div().child(l.text.slice(at)));
        el = el.child(h_flex().whitespace_nowrap().children(parts));
      } else el = el.child(l.text || " ");
      return column(typeof font === "string" ? el.font_family(font) : el);
    };
    const sizes = rows.map((l) => (l.kind === "header" ? HEADER : ROW));
    const id = `body-${thread.id}-${this.msg}`;
    const count = thread.messages.length;
    const arrow = (dir, enabled) => div().id(`msg-${dir}`).flex_none().size(20).rounded(10).flex().items_center().justify_center()
      .when(enabled, (el) => el.bg(t.raised).on_click((_e, cx) => { this.jumpMessage(dir === "left" ? 1 : -1); this.handle.focus(); cx.notify(); }))
      .child(svg(`mods/workspace-chrome/chevron-${dir}.svg`).size(12).text_color(enabled ? t.foreground : t.dim));
    const navigator = h_flex().flex_none().gap(6).items_center().text_size(11.5).text_color(t.muted)
      .child(arrow("left", this.msg < count - 1))
      .child(div().child(`Message ${this.msg + 1} of ${count}`))
      .child(arrow("right", this.msg > 0));
    const labels = this.list.find((th) => th.id === thread.id)?.labels ?? [];
        const files = thread.messages.reduce((n, m) => n + m.attachments.length, 0);
    return v_flex().flex_1().min_h(0)
      .child(column(v_flex().flex_none().gap(8).pb(10).border_b_1().border_color(t.border)
        .child(div().text_size(17).font_semibold().text_color(t.foreground).child(thread.subject))
        .child(h_flex().gap(6).items_center().flex_wrap()
          .when(labels.includes("STARRED"), (el) => el.child(pill(t, "Starred", t.ansi3, "star-fill")))
          .when(files > 0, (el) => el.child(pill(t, files > 1 ? `${files} attachments` : "1 attachment", t.muted, "paperclip")))
          .children(labels.filter((l) => !SYSTEM_LABEL.test(l)).map((l) => pill(t, l, t.ansi5, "tag")))
          .child(div().flex_1())
          .when(count > 1, (el) => el.child(navigator)))))
      .child(v_flex().relative().flex_1().min_h(0)
        .child(v_virtual_list(id, rows.length, sizes, (i) => `${thread.id}:${i}`, (range) => {
          if (range.end - range.start > 1 || rows.length <= 1) {
            this.top = range.start;
            this.page = range.end - range.start;
            this.range = range;
          }
          return rows.slice(range.start, range.end).map(row);
        }).track_scroll(this.bodyScroll).size_full()
          .on_item_click((key, cx) => {
            const row = rows[Number(key.split(":").pop())];
            if (row?.kind === "quoted") {
              this.toggleQuotes();
              this.handle.focus();
              cx.notify();
            } else if (row?.links?.length) exec("open", [row.links[0][2]]).catch(() => {});
          }))
        .child(Scrollbar.vertical(id).absolute().inset_0()));
  }

  renderHelp(t) {
    const groups = [...new Set(KEYS.map((k) => k.group))];
    return v_flex().flex_1().min_h(0).gap(14).p(4)
      .child(div().text_size(14).font_semibold().text_color(t.foreground).child("Keys"))
      .child(h_flex().gap(28).items_start().flex_wrap().children(groups.map((g) => v_flex().gap(4).min_w(200)
        .child(div().text_size(10.5).font_semibold().text_color(t.dim).child(g.toUpperCase()))
        .children(KEYS.filter((k) => k.group === g).map((k) => h_flex().gap(8).items_center()
          .child(h_flex().gap(3).w(64).flex_none().children(k.keys.map((x) => this.keyChip(t, x))))
          .child(div().text_size(12).text_color(t.muted).child(k.label)))))))
      .child(div().text_size(11.5).text_color(t.dim).child("Reading marks nothing read. Archive, trash and labels change Gmail at once; z undoes the last archive or trash. Any key closes this."));
  }

  renderPicker(t) {
    const item = this.list[this.index()];
    const list = this.pickerList();
    const at = Math.min(this.picker.at, Math.max(0, list.length - 1));
    const rows = list.map((label, i) => {
      const on = item?.labels.includes(label);
      return h_flex().id(`label-${i}`).flex_none().gap(8).px(10).h(28).rounded(6).items_center()
        .when(i === at, (el) => el.bg(t.raised))
        .on_click((_e, cx) => { this.picker.at = i; this.toggleLabel(cx); this.labelQuery.focus(); })
        .child(div().flex_none().size(14).rounded(3).border_1().border_color(on ? t.ansi5 : t.border).bg(on ? t.ansi5 : t.background)
          .flex().items_center().justify_center().text_size(10).text_color(t.background).child(on ? "✓" : ""))
        .child(icon("tag", on ? t.ansi5 : t.dim, 12))
        .child(div().truncate().text_color(on ? t.foreground : t.muted).child(label));
    });
    if (at >= 0 && at < list.length) this.pickerScroll.scroll_to_item(at);
    return v_flex().flex_1().min_h(0).gap(10)
      .child(h_flex().flex_none().gap(8).items_center()
        .child(icon("tag", t.ansi5, 16))
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Label as"))
        .child(div().text_size(12).text_color(t.dim).child(item?.subject ?? "")))
      .child(h_flex().h(32).flex_none().px(10).rounded(8).border_1().border_color(t.accent).bg(t.background).items_center()
        .child(Input.new(this.labelQuery).flex_1().h_full().text_size(12.5).text_color(t.foreground)))
      .child(this.labels
        ? v_flex().id("labels").flex_1().min_h(0).gap(1).overflow_y_scrollbar().track_scroll(this.pickerScroll).children(rows)
        : div().text_color(t.dim).child("Loading labels…"))
      .child(div().flex_none().text_size(11.5).text_color(t.dim).child("↑↓ choose · ↵ add or remove · Esc back"));
  }

  renderDetail(t) {
    const detail = v_flex().flex_1().min_w(0).h_full().px(24).pt(20).pb(8).rounded(10).bg(t.background).border_1().border_color(t.border);
    const centered = (title, note, iconName = "inbox", color = t.dim) => detail.items_center().justify_center().gap(6)
      .child(icon(iconName, color, 28))
      .child(div().text_size(18).font_semibold().text_color(t.foreground).child(title))
      .when(!!note, (el) => el.child(div().max_w(560).text_size(12).text_color(t.dim).child(note)));
    if (this.help) return detail.child(this.renderHelp(t));
    if (this.picker) return detail.child(this.renderPicker(t));
    if (this.route && this.list[this.index()]) {
      const item = this.list[this.index()];
      return detail.child(renderPicker(t, this.routeRows(), this.route.at, {
        title: "Send to a session",
        subtitle: item.subject,
        footer: this.routeSearch.active
          ? `↑↓ or ⌃j/⌃k choose · ↵ sends “${this.prompt(item)}” · Esc clear search`
          : `j/k choose · / search · ↵ sends “${this.prompt(item)}” · Esc back`,
        scroll: this.routeScroll,
        search: this.routeSearch,
        onPick: (i, cx) => this.pickSession(cx, i),
      }));
    }
    if (this.listError && !this.list.length) return centered("Couldn't load the inbox", `${this.listError} · ⌃R retries`, "inbox", t.ansi1);
    if (!this.list.length) return this.loading ? centered("Loading…") : centered("Inbox zero", null, "inbox", t.ansi2);
    const body = this.bodies[this.selId];
    if (body?.error) return centered("Couldn't load this thread", body.error, "mail", t.ansi1);
    const shown = this.bodies[this.shownId];
    if (!shown?.thread) return centered("Loading…", null, "mail");
    const stale = this.shownId !== this.selId;
    return detail.child(this.renderBody(t, shown))
      .when(stale, (el) => el.child(div().flex_none().pt(6).text_size(11.5).text_color(t.dim).child("loading…")));
  }

  renderFooter(t) {
    return h_flex().flex_none().gap(12).items_center().pt(2)
      .children(KEYS.filter((k) => k.footer).map((k) => h_flex().gap(5).items_center().child(this.keyChip(t, k.keys[0])).child(div().text_size(11.5).text_color(t.muted).child(k.label))))
      .child(div().flex_1())
      .when(!!this.note, (el) => el.child(div().max_w(520).truncate().text_size(11.5)
        .text_color({ error: t.ansi1, success: t.ansi2 }[this.note.level] ?? t.muted).child(this.note.text)))
      .when(!this.note && !!this.listError && this.list.length > 0, (el) => el.child(div().max_w(520).truncate().text_size(11.5).text_color(t.ansi1).child(this.listError)));
  }

  render() {
    const t = theme();
    const unread = this.list.filter((th) => th.unread).length;
    return v_flex()
      .id("mail")
      .track_focus(this.handle)
      .when(Boolean(this.route || this.picker || this.help), (el) => el.on_action("overlay.close", (_e, cx) => {
        this.back(cx);
        cx.stop_propagation();
      }))
      .on_key_down((e, cx) => this.key(e, cx))
      .size_full()
      .p(16)
      .gap(12)
      .bg(t.popover)
      .text_size(13)
      .child(h_flex().flex_none().items_center().gap(10)
        .child(icon("inbox", t.accent, 16))
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Mail"))
        .when(unread > 0, (el) => el.child(h_flex().flex_none().px(7).h(18).rounded(9).bg(t.accent).text_color(t.accent_foreground).text_size(11).items_center().child(`${unread} unread`)))
        .child(div().flex_1())
        .when(this.loading, (el) => el.child(div().text_size(11.5).text_color(t.dim).child("refreshing…"))))
      .child(h_flex().flex_1().min_h(0).gap(12).child(this.renderList(t)).child(this.renderDetail(t)))
      .child(this.renderFooter(t));
  }
}
