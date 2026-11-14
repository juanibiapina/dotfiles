// GitHub inbox: notifications grouped by how much they need you, and for the
// selected one, what happened since you last looked. KEYS below is the one
// list of what every key does; the footer and the ? sheet are drawn from it.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, TextareaState, Textarea, ScrollHandle, TextView } from "gpui-base";
import { exec, spaces, home, run, theme, props, openOverlay, closeOverlay, shared, setShared } from "herdr";
import * as github from "./github.js";
import * as sessions from "./sessions.js";
import { targets as routeTargets, filter as filterTargets, describe, presets, labelKey, linkIndex } from "./routing.js";
import { REACTIONS } from "./thread.js";
import { listRow, sectionHeader, timelineItem, look, icon, pill, ciMark, summaryText, when, REASON } from "./ui.js";

const REFRESH_MS = 60_000;

const SECTIONS = [
  ["review", "Review requested"],
  ["mention", "Mentioned"],
  ["yours", "Yours"],
  ["talk", "Conversations"],
  ["other", "CI, releases & bots"],
];

function sectionOf(th, v) {
  const done = v?.state === "merged" || v?.state === "closed";
  if (th.reason === "review_requested" && !done) return "review";
  if (["mention", "team_mention", "assign"].includes(th.reason)) return "mention";
  if (th.reason === "author") return "yours";
  if (th.reason === "subscribed" && v?.authorBot) return "other";
  if (["PullRequest", "Issue", "Discussion"].includes(th.type)) return "talk";
  return "other";
}

// kinds: the thread kinds a key acts on (all when absent). footer: shown in the footer.
const KEYS = [
  { keys: ["j", "down"], label: "next", group: "Move", act: "next" },
  { keys: ["k", "up"], label: "previous", group: "Move", act: "prev" },
  { keys: ["J"], label: "next item in thread", group: "Move", act: "itemNext", kinds: ["pr", "issue"] },
  { keys: ["K"], label: "previous item in thread", group: "Move", act: "itemPrev", kinds: ["pr", "issue"] },
  { keys: ["g"], label: "first", group: "Move", act: "first" },
  { keys: ["G"], label: "last", group: "Move", act: "last" },
  { keys: ["e"], label: "earlier history", group: "Move", act: "expand", kinds: ["pr", "issue"] },
  { keys: ["/"], label: "filter", group: "Move", act: "filter" },
  { keys: ["d"], label: "dismiss", group: "Triage", act: "dismiss", footer: true },
  { keys: ["D"], label: "dismiss section", group: "Triage", act: "dismissSection" },
  { keys: ["u"], label: "unsubscribe", group: "Triage", act: "unsubscribe" },
  { keys: ["a"], label: "review", group: "Respond", act: "review", kinds: ["pr"], footer: true },
  { keys: ["v"], label: "diff", group: "Respond", act: "diff", kinds: ["pr"], footer: true },
  { keys: ["c"], label: "comment", group: "Respond", act: "comment", kinds: ["pr", "issue"], footer: true },
  { keys: ["r"], label: "reply", group: "Respond", act: "reply", kinds: ["pr", "issue"], footer: true },
  { keys: ["l"], label: "react", group: "Respond", act: "react", kinds: ["pr", "issue"], footer: true },
  { keys: ["R"], label: "rerun failed", group: "Respond", act: "rerun", kinds: ["ci"], footer: true },
  { keys: ["p"], label: "send to a session", group: "Go", act: "route", footer: true },
  { keys: ["o", "enter"], label: "open", group: "Go", act: "open", footer: true },
  { keys: ["s"], label: "go to its session or space", group: "Go", act: "space" },
  { keys: ["ctrl-r"], label: "reload", group: "Other", act: "reload" },
  { keys: ["?"], label: "all keys", group: "Other", act: "help", footer: true },
  { keys: ["q", "escape"], label: "close", group: "Other", act: "close" },
];
const KEY_LABEL = { down: "↓", up: "↑", enter: "↵", escape: "Esc", "ctrl-r": "⌃R" };

function keyName(e) {
  const m = e.modifiers ?? {};
  if (m.control) return `ctrl-${e.key}`;
  if (m.platform) return `cmd-${e.key}`;
  if (["down", "up", "enter", "escape", "tab", "backspace"].includes(e.key)) return e.key;
  return e.key_char || e.key;
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

const kindOf = (th, v) => v?.kind ?? ({ PullRequest: "pr", Issue: "issue", CheckSuite: "ci", Release: "release" }[th.type] ?? "other");
const errorText = (e) => String(e?.message ?? e);
const viewKey = (th) => `${th.updated_at}|${github.baseline(th) ?? ""}`;
const REACTABLE = new Set(["description", "comment", "review"]);

const threadNumber = (th) => Number(th.url?.match(/\/(?:pulls|issues)\/(\d+)$/)?.[1]) || null;
const STATUS_WORD = { working: "working", blocked: "needs you", done: "finished", idle: "idle" };

export default class Inbox extends View {
  init(_props, cx) {
    const cache = shared("inbox.cache") ?? {};
    this.threads = cache.threads ?? [];
    this.views = cache.views ?? {};
    this.selId = shared("inbox.at") ?? null;
    this.items = {}; // thread id → selected timeline item id
    this.expanded = new Set();
    this.shownId = null;
    this.mode = null; // "filter" | "compose" | "route" | "routeMsg" | "react" | "help"
    this.compose = null; // { kind: "comment" | "reply" | "review", threadId, itemId, event }
    this.draftKey = null;
    this.route = null; // { threadId, at, places, target, preset }
    this.confirm = null;
    this.msg = null;
    this.loading = false;
    this.handle = cx.focus_handle();
    this.listScroll = ScrollHandle.new();
    this.detailScroll = ScrollHandle.new();
    this.filter = InputState.new({ placeholder: "Filter by repo, title or reason…" });
    this.filter.on("change", (_e, cx) => cx.notify());
    this.filter.on("submit", (_e, cx) => this.endMode(cx));
    this.text = TextareaState.new({ rows: 4 });
    this.text.set_auto_grow(4, 14);
    this.routeQuery = InputState.new({ placeholder: "Filter sessions and places…" });
    this.routeQuery.on("change", (_e, cx) => { if (this.route) this.route.at = 0; cx.notify(); });
    this.routeQuery.on("submit", (_e, cx) => this.pickTarget(cx));
    this.routeText = TextareaState.new({ rows: 4 });
    this.routeText.set_auto_grow(3, 10);
    cx.timer.after(0, () => this.handle.focus());
    cx.timer.after(300, () => { if (!this.mode) this.handle.focus(); });
    cx.timer.every(REFRESH_MS, (cx) => this.reload(cx));
    this.reload(cx);
  }

  // ---- State ----

  close() {
    setShared("inbox.at", this.selId);
    closeOverlay(props().overlay);
  }

  save() {
    setShared("inbox.cache", { threads: this.threads, views: this.views });
  }

  groups() {
    const q = this.filter.value().trim().toLowerCase();
    const groups = SECTIONS.map(([key, label]) => ({ key, label, threads: [] }));
    for (const th of this.threads) {
      if (q && !fuzzy(`${th.repo} ${th.title} ${REASON[th.reason] ?? th.reason} ${th.type}`, q)) continue;
      groups.find((g) => g.key === sectionOf(th, this.views[th.id])).threads.push(th);
    }
    for (const g of groups) g.threads.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    return groups.filter((g) => g.threads.length);
  }

  ordered() {
    return this.groups().flatMap((g) => g.threads);
  }

  current() {
    const all = this.ordered();
    return all.find((th) => th.id === this.selId) ?? all[0] ?? null;
  }

  // The timeline as shown: earlier history (or a fold), a divider, then what's new.
  display(th, v) {
    if (!v || (v.kind !== "pr" && v.kind !== "issue")) return [];
    const older = [...(v.descriptionIsNew ? [] : [v.description]), ...v.olderItems];
    const fresh = [...(v.descriptionIsNew ? [v.description] : []), ...v.newItems];
    const open = this.expanded.has(th.id) || !fresh.length;
    const rows = [];
    if (older.length && open) {
      if (v.olderOnGitHub) rows.push({ more: v.olderOnGitHub });
      for (const it of older) rows.push({ item: it, fresh: false });
    } else if (older.length) {
      rows.push({ fold: older.length + v.olderOnGitHub });
    }
    if (fresh.length && v.since) rows.push({ divider: v.since });
    for (const it of fresh) rows.push({ item: it, fresh: !!v.since && it.author !== v.viewer });
    return rows;
  }

  selectedItem(th, v, rows = this.display(th, v)) {
    const items = rows.filter((r) => r.item).map((r) => r.item);
    const chosen = items.find((it) => it.id === this.items[th.id]);
    if (chosen) return chosen;
    const firstNew = rows.find((r) => r.item && r.fresh)?.item;
    return firstNew ?? items.at(-1) ?? null;
  }

  flash(cx, text, level = "info") {
    this.msg = { level, text };
    cx.notify();
  }

  // ---- GitHub ----

  reload(cx) {
    if (this.loading) return;
    this.loading = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        this.threads = await github.listThreads();
        const ids = new Set(this.threads.map((th) => th.id));
        for (const id of Object.keys(this.views)) if (!ids.has(id)) delete this.views[id];
        cx.notify();
        const stale = this.threads.filter((th) => this.views[th.id]?.key !== viewKey(th));
        const worker = async () => {
          for (let th; (th = stale.shift()); ) {
            await this.loadView(th);
            cx.notify();
          }
        };
        await Promise.all([worker(), worker(), worker(), worker()]);
        this.save();
      } catch (e) {
        this.msg = { level: "error", text: errorText(e) };
      }
      this.loading = false;
      cx.notify();
    });
  }

  async loadView(th) {
    const key = viewKey(th);
    try {
      this.views[th.id] = { ...(await github.loadThread(th)), key };
    } catch (e) {
      this.views[th.id] = { error: errorText(e), key };
    }
  }

  // Runs an action, reports it in the status line, then reloads the thread unless told otherwise.
  act(cx, label, fn, { th, undo } = {}) {
    this.flash(cx, `${label}…`);
    cx.spawn(async (cx) => {
      try {
        await fn();
        this.msg = { level: "success", text: label };
        if (th) {
          cx.notify();
          await this.loadView(th);
          this.save();
        }
      } catch (e) {
        undo?.();
        this.msg = { level: "error", text: `${label} failed: ${errorText(e)}` };
      }
      cx.notify();
    });
  }

  async markRead(th) {
    await github.markRead(th);
    th.unread = false;
    th.last_read_at = new Date().toISOString();
    await this.loadView(th);
    this.save();
  }

  dismiss(cx, list, label) {
    const ids = new Set(list.map((th) => th.id));
    const all = this.ordered();
    const i = all.findIndex((th) => th.id === this.current()?.id);
    const next = all.slice(i + 1).find((th) => !ids.has(th.id)) ?? all.slice(0, i).reverse().find((th) => !ids.has(th.id));
    const before = { threads: this.threads, selId: this.selId };
    this.threads = this.threads.filter((th) => !ids.has(th.id));
    this.selId = next?.id ?? null;
    this.save();
    this.act(cx, label, async () => {
      await (label.startsWith("Unsubscribed") ? github.unsubscribe(list[0]) : github.dismiss(list));
      for (const id of ids) delete this.views[id];
      this.save();
    }, { undo: () => { Object.assign(this, before); this.save(); } });
  }

  // ---- Places ----

  // The open space working in the repo: the shown one, else one on this Mac, else any.
  spaceFor(repo) {
    const suffix = `/workspace/${repo}`;
    const inRepo = (s) => s.folder && (s.folder.endsWith(suffix) || s.folder.includes(`${suffix}/`));
    const all = spaces();
    return all.find((s) => inRepo(s) && s.active) ?? all.find((s) => inRepo(s) && !s.machine) ?? all.find(inRepo);
  }

  // The thread as routing.js sees it.
  subjectOf(th, v) {
    return {
      repo: th.repo, number: v?.number ?? threadNumber(th), kind: kindOf(th, v), url: v?.url ?? github.webUrl(th, v),
      title: v?.title ?? th.title, reason: th.reason, head: v?.pr?.head, failing: v?.pr?.ci === "failure",
      summary: v?.summary ? summaryText(v.summary) : "",
    };
  }

  // The live session the thread was last routed to, if any.
  linkFor(th) {
    const key = labelKey({ repo: th.repo, number: threadNumber(th) });
    return key ? this.links?.get(key)?.[0]?.session ?? null : null;
  }

  async openDiff(th, v) {
    const dir = `${home()}/workspace/${th.repo}`;
    const cwd = (await exec("test", ["-d", dir])).code === 0 ? dir : home();
    // zsh -ic: deltoids needs keys from zshrc.secret, which the core's environment lacks.
    const r = await exec("hc", ["run", "--json", "--bg", "--no-parent", "--rm", "--cwd", cwd, "--", "zsh", "-ic", 'exec deltoids pr "$1"', "zsh", v.url]);
    if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim());
    const { address } = JSON.parse(r.stdout);
    await this.markRead(th).catch(() => {});
    // Close this dialog first: closing it after the next one opens hands the
    // keyboard to that dialog's frame instead of its terminal.
    this.close();
    openOverlay({ kind: "dialog", width: 0.9, height: 0.9, layout: { type: "block", content: { terminal: address } } });
  }

  async goToSpace(th) {
    const space = this.spaceFor(th.repo);
    const folder = space ? null : await sessions.cloneHere(th.repo);
    await this.markRead(th).catch(() => {});
    this.close();
    if (space) run("space.select", { id: space.id });
    else openOverlay({ mod: "new-space", props: { folder }, kind: "popup", width: 1, height: 1, frame: "none" });
  }

  // ---- Modes ----

  startCompose(cx, kind, th, v, item) {
    const key = `${kind}:${th.id}:${item?.id ?? ""}`;
    if (this.draftKey !== key) {
      let value = "";
      if (kind === "reply" && item) {
        const quote = (item.body ?? "").trim().split("\n").filter((l) => l.trim()).slice(0, 3).map((l) => `> ${l}`).join("\n");
        value = `${quote ? `${quote}\n\n` : ""}@${item.author} `;
      }
      this.text.set_value(value);
      this.draftKey = key;
    }
    this.compose = { kind, threadId: th.id, itemId: item?.id ?? null, event: 0 };
    this.mode = "compose";
    this.text.focus();
    cx.notify();
  }

  endMode(cx) {
    if (this.mode === "filter" && !this.filter.value().trim()) this.filter.set_value("");
    this.mode = null;
    this.compose = null;
    this.route = null;
    this.handle.focus();
    cx.notify();
  }

  // ---- Routing: pick a target, then write the message ----

  startRoute(cx, th) {
    this.route = { threadId: th.id, at: 0, places: null, target: null, preset: 0 };
    this.routeQuery.set_value("");
    this.mode = "route";
    this.routeQuery.focus();
    cx.notify();
    cx.spawn(async (cx) => {
      let places;
      try { places = await sessions.listPlaces(th.repo); } catch { places = [{ kind: "clone-here", repo: th.repo }]; }
      if (this.route?.threadId === th.id) {
        this.route.places = places;
        cx.notify();
      }
    });
  }

  routeList(th, v) {
    const subject = this.subjectOf(th, v);
    return filterTargets(routeTargets(sessions.listSessions(), this.route?.places ?? [], subject), this.routeQuery.value(), subject);
  }

  routePresets(th, v) {
    const subject = this.subjectOf(th, v);
    const target = this.route?.target;
    const linkedAt = target?.kind === "session" && target.why === "linked" ? target.session.labels[labelKey(subject)] : null;
    return presets(subject, { linkedAt });
  }

  pickTarget(cx) {
    const th = this.current();
    const v = th && this.views[th.id];
    if (!th || !this.route) return;
    const target = this.routeList(th, v)[this.route.at];
    if (!target) return;
    if (target.blocked) return this.flash(cx, `${target.session.name} needs you first: answer it, then send`, "warning");
    this.route.target = target;
    this.route.preset = 0;
    this.routeText.set_value(this.routePresets(th, v)[0].text);
    this.mode = "routeMsg";
    this.routeText.focus();
    cx.notify();
  }

  sendRoute(cx) {
    const th = this.current();
    const v = th && this.views[th.id];
    const target = this.route?.target;
    const text = this.routeText.value().trim();
    if (!th || !target || !text) return;
    const subject = this.subjectOf(th, v);
    const { title } = describe(target, subject);
    if (target.kind === "session") this.act(cx, `Sent to ${title}`, () => sessions.send(target.session, text, subject));
    else this.act(cx, title.replace(/^New/, "Started a new"), () => sessions.start(target.place, text, subject));
    this.endMode(cx);
  }

  submit(cx) {
    const th = this.current();
    const v = th && this.views[th.id];
    if (!th || !v || this.mode !== "compose") return;
    const body = this.text.value().trim();
    const { kind, event } = this.compose;
    const clear = () => { this.text.set_value(""); this.draftKey = null; };
    if (kind === "review") {
      const [flag, label] = github.REVIEW_EVENTS[event];
      if (flag !== "approve" && !body) return this.flash(cx, `${label} needs a comment`);
      this.act(cx, `${label === "Comment" ? "Reviewed" : label === "Approve" ? "Approved" : "Requested changes on"} #${v.number}`, async () => {
        await github.review(v, flag, body);
        clear();
      }, { th });
    } else {
      if (!body) return;
      this.act(cx, `${kind === "reply" ? "Replied on" : "Commented on"} #${v.number}`, async () => {
        await github.comment(v, body);
        clear();
      }, { th });
    }
    this.endMode(cx);
  }

  // ---- Keys ----

  key(e, cx) {
    const k = keyName(e);
    const th = this.current();
    const v = th && this.views[th.id];

    if (this.mode === "route") {
      if (k === "escape") this.endMode(cx);
      else if (k === "down" || k === "up" || k === "ctrl-n" || k === "ctrl-p") {
        const n = this.routeList(th, v).length || 1;
        this.route.at = (this.route.at + (k === "up" || k === "ctrl-p" ? n - 1 : 1)) % n;
        cx.notify();
      } else return;
      return cx.stop_propagation();
    }
    if (this.mode === "routeMsg") {
      if (k === "escape") {
        this.mode = "route";
        this.routeQuery.focus();
        cx.notify();
      } else if (k === "cmd-enter" || k === "ctrl-enter") this.sendRoute(cx);
      else if (k === "tab") {
        const list = this.routePresets(th, v);
        this.route.preset = (this.route.preset + 1) % list.length;
        this.routeText.set_value(list[this.route.preset].text);
        cx.notify();
      } else return;
      return cx.stop_propagation();
    }
    if (this.mode === "compose") {
      if (k === "escape") this.endMode(cx);
      else if (k === "cmd-enter" || k === "ctrl-enter") this.submit(cx);
      else if (this.compose.kind === "review" && k === "tab") {
        this.compose.event = (this.compose.event + 1) % github.REVIEW_EVENTS.length;
        cx.notify();
      } else return;
      return cx.stop_propagation();
    }
    if (this.mode === "filter") {
      if (k === "escape") { this.filter.set_value(""); this.endMode(cx); }
      else if (k === "down" || k === "ctrl-n") this.move(cx, 1);
      else if (k === "up" || k === "ctrl-p") this.move(cx, -1);
      else return;
      return cx.stop_propagation();
    }
    if (this.mode === "react") {
      cx.stop_propagation();
      const n = Number(k);
      if (n >= 1 && n <= REACTIONS.length) {
        const item = this.selectedItem(th, v);
        const [content, emoji] = REACTIONS[n - 1];
        if (item) this.act(cx, `${emoji} on ${item.author === v.viewer ? "your" : `${item.author}'s`} ${item.kind}`, () => github.react(item, content), { th });
      }
      return this.endMode(cx);
    }
    if (this.mode === "help") {
      cx.stop_propagation();
      return this.endMode(cx);
    }

    const entry = KEYS.find((x) => x.keys.includes(k));
    if (!entry) return;
    cx.stop_propagation();
    if (this.confirm && entry.act !== "dismissSection") this.confirm = null;
    const kind = th ? kindOf(th, v) : null;
    if (entry.kinds && !entry.kinds.includes(kind)) return this.flash(cx, `${entry.label[0].toUpperCase()}${entry.label.slice(1)} works on ${entry.kinds.map((x) => ({ pr: "pull requests", issue: "issues", ci: "CI runs" })[x]).join(" and ")}`);
    this.run(entry.act, cx, th, v);
  }

  move(cx, delta, absolute) {
    const all = this.ordered();
    if (!all.length) return;
    const i = all.findIndex((th) => th.id === this.current()?.id);
    const to = absolute ?? Math.max(0, Math.min(all.length - 1, i + delta));
    this.selId = all[to].id;
    this.msg = null;
    const child = this.listChild?.[this.selId];
    if (child !== undefined) this.listScroll.scroll_to_item(child);
    cx.notify();
  }

  moveItem(cx, th, v, delta) {
    const rows = this.display(th, v);
    const items = rows.filter((r) => r.item).map((r) => r.item);
    const cur = this.selectedItem(th, v, rows);
    const i = Math.max(0, Math.min(items.length - 1, items.indexOf(cur) + delta));
    if (!items[i]) return;
    this.items[th.id] = items[i].id;
    this.detailScroll.scroll_to_item(rows.findIndex((r) => r.item === items[i]));
    cx.notify();
  }

  run(act, cx, th, v) {
    const needView = () => {
      if (v && !v.error) return true;
      this.flash(cx, v?.error ? v.error : "Still loading this thread…", v?.error ? "error" : "info");
      return false;
    };
    switch (act) {
      case "next": return this.move(cx, 1);
      case "prev": return this.move(cx, -1);
      case "first": return this.move(cx, 0, 0);
      case "last": return this.move(cx, 0, this.ordered().length - 1);
      case "itemNext": return th && v && this.moveItem(cx, th, v, 1);
      case "itemPrev": return th && v && this.moveItem(cx, th, v, -1);
      case "filter":
        this.mode = "filter";
        this.filter.focus();
        return cx.notify();
      case "help":
        this.mode = "help";
        return cx.notify();
      case "close": return this.close();
      case "reload": return this.reload(cx);
    }
    if (!th) return;
    switch (act) {
      case "expand":
        if (this.expanded.has(th.id)) this.expanded.delete(th.id);
        else this.expanded.add(th.id);
        return cx.notify();
      case "dismiss":
        return this.dismiss(cx, [th], `Dismissed “${th.title}”`);
      case "dismissSection": {
        const group = this.groups().find((g) => g.threads.some((x) => x.id === th.id));
        if (this.confirm?.key === group.key) {
          this.confirm = null;
          return this.dismiss(cx, group.threads, `Dismissed ${group.threads.length} in ${group.label}`);
        }
        this.confirm = { key: group.key };
        return this.flash(cx, `Press D again to dismiss all ${group.threads.length} in ${group.label}`, "warning");
      }
      case "unsubscribe":
        return this.dismiss(cx, [th], `Unsubscribed from “${th.title}”`);
      case "open": {
        const url = github.webUrl(th, v, v && this.selectedItem(th, v));
        exec("open", [url]);
        return this.act(cx, "Opened in the browser", () => this.markRead(th));
      }
      case "space": {
        const linked = this.linkFor(th);
        if (!linked) return this.act(cx, "Going to the space", () => this.goToSpace(th));
        return this.act(cx, `Going to ${linked.name}`, async () => {
          await this.markRead(th).catch(() => {});
          run("pane.focus", { terminal: linked.address });
          this.close();
        });
      }
      case "route":
        return this.startRoute(cx, th);
    }
    if (!needView()) return;
    const item = this.selectedItem(th, v);
    switch (act) {
      case "review": return this.startCompose(cx, "review", th, v);
      case "comment": return this.startCompose(cx, "comment", th, v);
      case "reply":
        if (!item || !REACTABLE.has(item.kind)) return this.flash(cx, "Select a comment to reply to (J/K)");
        return this.startCompose(cx, "reply", th, v, item);
      case "react":
        if (!item || !REACTABLE.has(item.kind)) return this.flash(cx, "Select a comment to react to (J/K)");
        this.mode = "react";
        return cx.notify();
      case "diff":
        return this.act(cx, "Opening the diff", () => this.openDiff(th, v));
      case "rerun":
        if (!v.run) return this.flash(cx, "No workflow run found for this notification");
        return this.act(cx, `Rerunning failed jobs of ${v.run.workflow}`, () => github.rerunFailed(v), { th });
    }
  }

  // ---- Drawing ----

  keyChip(t, k) {
    return div().flex_none().px(5).h(18).rounded(4).bg(t.raised).text_color(t.foreground).text_size(11).flex().items_center().child(KEY_LABEL[k] ?? k);
  }

  renderList(t, groups, sel) {
    const children = [];
    this.listChild = {};
    groups.forEach((g, gi) => {
      children.push(sectionHeader(t, g.label, g.threads.length, gi === 0));
      for (const th of g.threads) {
        this.listChild[th.id] = children.length;
        children.push(listRow(t, th, this.views[th.id], th.id === sel?.id, this.linkFor(th))
          .on_click((_e, cx) => { this.selId = th.id; this.msg = null; this.handle.focus(); cx.notify(); }));
      }
    });
    return v_flex().id("inbox-list").w(460).flex_none().h_full().gap(1).overflow_y_scrollbar().track_scroll(this.listScroll).children(children);
  }

  renderHeader(t, th, v) {
    const l = look(t, th, v);
    const num = v?.number ?? th.url?.match(/\/(\d+)$/)?.[1];
    const meta = h_flex().gap(6).flex_wrap().items_center().text_size(11.5).text_color(t.dim);
    let line = meta;
    if (v?.state) line = line.child(pill(t, v.state, t.background, l.color));
    if (v?.run?.conclusion) line = line.child(pill(t, v.run.conclusion.replace(/_/g, " "), t.background, l.color));
    line = line.child(div().child(`${th.repo}${num ? `#${num}` : ""}`));
    if (v?.author) line = line.child(div().child(`by ${v.author}`));
    for (const label of v?.labels ?? []) line = line.child(pill(t, label));

    let header = v_flex().flex_none().gap(6)
      .child(h_flex().gap(8).items_start()
        .child(div().pt(3).child(icon(l.icon, l.color, 16)))
        .child(div().flex_1().min_w(0).text_size(16).font_semibold().text_color(t.foreground).child(v?.title ?? th.title)))
      .child(line);

    if (v?.pr) {
      const p = v.pr;
      const decision = { APPROVED: ["approved", t.ansi2], CHANGES_REQUESTED: ["changes requested", t.ansi1], REVIEW_REQUIRED: ["review required", t.ansi3] }[p.decision];
      header = header.child(h_flex().gap(10).items_center().flex_wrap().text_size(11.5).text_color(t.dim)
        .child(div().child(`${p.head} → ${p.base}`))
        .child(h_flex().gap(4).child(div().text_color(t.ansi2).child(`+${p.additions}`)).child(div().text_color(t.ansi1).child(`−${p.deletions}`)))
        .child(div().child(`${p.files} file${p.files === 1 ? "" : "s"}`))
        .when(!!p.ci, (el) => el.child(h_flex().gap(4).child(ciMark(t, p.ci)).child(div().child(`checks ${p.ci}`))))
        .when(!!decision, (el) => el.child(div().text_color(decision[1]).child(decision[0])))
        .when(p.pending.length > 0, (el) => el.child(div().child(`waiting on ${p.pending.join(", ")}`))));
    }

    if (v?.kind === "pr" || v?.kind === "issue") {
      const s = summaryText(v.summary);
      const text = !v.since ? "New to you"
        : v.newCount ? `Since you looked · ${when(v.since)} — ${s || "activity"}`
        : `Nothing new since you looked · ${when(v.since)}`;
      header = header.child(div().pt(2).text_size(12).text_color(v.since && !v.newCount ? t.dim : t.accent).child(text));
    }
    const linked = this.linkFor(th);
    if (linked) {
      header = header.child(h_flex().gap(6).items_center().text_size(12)
        .child(div().text_color(t.dim).child("Handled by"))
        .child(div().font_semibold().text_color(t.foreground).child(linked.name))
        .child(div().text_color(t[linked.status] ?? t.dim).child(`● ${STATUS_WORD[linked.status] ?? linked.status}`))
        .child(div().text_color(t.dim).child([linked.space, linked.machine].filter(Boolean).join(" · ")))
        .child(this.keyChip(t, "s")));
    }
    return header;
  }

  renderTimeline(t, th, v) {
    const rows = this.display(th, v);
    const sel = this.selectedItem(th, v, rows);
    const picker = () => h_flex().pl(19).gap(4).children(REACTIONS.map(([content, emoji], i) =>
      h_flex().id(`react-${content}`).px(6).h(24).gap(4).rounded(6).items_center().cursor_pointer().bg(t.raised)
        .hover((el) => el.bg(t.hover))
        .on_click((_e, cx) => { this.mode = "react"; this.key({ key: String(i + 1), key_char: String(i + 1), modifiers: {} }, cx); })
        .child(div().text_size(10.5).text_color(t.dim).child(String(i + 1)))
        .child(div().text_size(13).child(emoji))));
    const children = rows.map((r, i) => {
      if (r.fold !== undefined) {
        return h_flex().id("fold").flex_none().px(12).py(4).gap(6).items_center().cursor_pointer().text_size(11.5).text_color(t.dim)
          .hover((el) => el.text_color(t.muted))
          .on_click((_e, cx) => { this.expanded.add(th.id); cx.notify(); })
          .child(div().child(`▸ ${r.fold} earlier`))
          .child(this.keyChip(t, "e"));
      }
      if (r.more !== undefined) {
        return div().id("more").flex_none().px(12).py(4).text_size(11.5).text_color(t.dim).child(`${r.more} older items on GitHub`);
      }
      if (r.divider) {
        return h_flex().id("divider").flex_none().px(12).py(6).gap(8).items_center()
          .child(div().text_size(10.5).font_semibold().text_color(t.accent).child(`NEW SINCE ${when(r.divider).toUpperCase()}`))
          .child(div().flex_1().h(1).bg(t.accent).opacity(0.4));
      }
      const selected = r.item === sel;
      return timelineItem(t, r.item, { selected, fresh: r.fresh, viewer: v.viewer, picker: selected && this.mode === "react" ? picker() : null })
        .on_click((_e, cx) => { this.items[th.id] = r.item.id; this.handle.focus(); cx.notify(); });
    });
    if (this.shownId !== th.id) {
      this.shownId = th.id;
      const at = rows.findIndex((r) => r.divider) ;
      this.detailScroll.scroll_to_item(at >= 0 ? at : Math.max(0, rows.findIndex((r) => r.item === sel)));
    }
    return children;
  }

  renderBody(t, th, v) {
    if (!v) return [div().text_color(t.dim).child("Loading…")];
    if (v.error) return [div().text_color(t.ansi1).child(v.error)];
    if (v.kind === "pr" || v.kind === "issue") return this.renderTimeline(t, th, v);
    if (v.kind === "ci") {
      if (!v.run) return [div().text_color(t.dim).child("No workflow run found. o opens the repository's Actions.")];
      const color = v.run.conclusion === "success" ? t.ansi2 : v.run.conclusion === "failure" ? t.ansi1 : t.ansi3;
      return [v_flex().gap(8).px(12).text_size(12.5)
        .child(div().text_color(t.foreground).child(v.run.title))
        .child(div().text_color(t.dim).child(`${v.run.workflow} on ${v.run.branch}`))
        .child(h_flex().gap(6).child(div().text_color(t.dim).child("Latest run:")).child(div().text_color(color).child(v.run.conclusion.replace(/_/g, " "))))
        .when(v.run.failed.length > 0, (el) => el.child(v_flex().gap(2).pt(4)
          .child(div().text_size(11).font_semibold().text_color(t.dim).child("FAILED JOBS"))
          .children(v.run.failed.map((j) => h_flex().gap(6).child(icon("icons-juan/gh-x.svg", t.ansi1, 12)).child(div().text_color(t.foreground).child(j))))))];
    }
    if (v.kind === "release") {
      return [v_flex().gap(8).px(12).text_size(12.5)
        .child(div().text_color(t.dim).child(`${v.release.tag_name} · by ${v.release.author}`))
        .child(v.release.body?.trim() ? div().child(TextViewMarkdown(`rel-${th.id}`, v.release.body)) : div().text_color(t.dim).child("No release notes."))];
    }
    return [div().px(12).text_color(t.dim).child("Nothing to show here. o opens it on GitHub.")];
  }

  renderRoute(t, th, v, frame) {
    const subject = this.subjectOf(th, v);
    if (this.mode === "routeMsg") {
      const list = this.routePresets(th, v);
      const { title, detail } = describe(this.route.target, subject);
      return frame
        .child(h_flex().gap(8).items_center()
          .child(div().flex_none().font_semibold().text_color(t.foreground).child(`To ${title}`))
          .child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(t.dim).child(detail))
          .child(div().flex_none().text_size(11).text_color(t.dim).child("Tab preset · ⌘↵ send · Esc back")))
        .child(h_flex().gap(6).flex_wrap().children(list.map((p, i) => {
          const on = i === this.route.preset;
          return div().id(`pre-${p.id}`).px(8).h(22).rounded(11).flex().items_center().cursor_pointer().text_size(11.5)
            .bg(on ? t.accent : t.raised).text_color(on ? t.accent_foreground : t.muted)
            .on_click((_e, cx) => { this.route.preset = i; this.routeText.set_value(p.text); this.routeText.focus(); cx.notify(); })
            .child(p.label);
        })))
        .child(Textarea.new(this.routeText).w_full().text_size(12.5).text_color(t.foreground));
    }
    const list = this.routeList(th, v);
    this.route.at = Math.min(this.route.at, Math.max(0, list.length - 1));
    const row = (x, i) => {
      const on = i === this.route.at;
      const { title, detail } = describe(x, subject);
      const status = x.kind === "session" ? x.session.status : null;
      return h_flex().id(`tg-${i}`).flex_none().h(28).px(8).gap(8).rounded(5).items_center().cursor_pointer()
        .when(on, (el) => el.bg(t.selected))
        .hover((el) => el.bg(t.hover))
        .on_click((_e, cx) => { this.route.at = i; this.pickTarget(cx); })
        .child(div().w(8).flex_none().text_size(10).text_color(status ? t[status] ?? t.dim : t.accent).child(status ? "●" : "+"))
        .child(div().flex_none().max_w(360).truncate().text_color(on ? t.foreground : t.muted).when(on, (el) => el.font_semibold()).child(title))
        .child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(x.why === "linked" ? t.accent : x.blocked ? t.blocked : t.dim).child(detail))
        .when(!!status, (el) => el.child(div().flex_none().text_size(11).text_color(t[status] ?? t.dim).child(STATUS_WORD[status] ?? status)));
    };
    return frame
      .child(h_flex().items_center()
        .child(div().flex_1().font_semibold().text_color(t.foreground).child("Send to a session"))
        .child(div().text_size(11).text_color(t.dim).child("type to filter · ↑↓ · ↵ choose · Esc")))
      .child(h_flex().h(32).px(8).rounded(6).border_1().border_color(t.border).bg(t.background).items_center()
        .child(Input.new(this.routeQuery).flex_1().h_full().text_size(12.5).text_color(t.foreground)))
      .child(v_flex().id("route-list").max_h(300).gap(1).overflow_y_scrollbar()
        .children(list.map(row))
        .when(this.route.places === null, (el) => el.child(div().px(8).h(24).text_size(11.5).text_color(t.dim).child("Looking for clones on your machines…")))
        .when(list.length === 0 && this.route.places !== null, (el) => el.child(div().px(8).h(24).text_size(11.5).text_color(t.dim).child("Nothing matches"))));
  }

  renderComposer(t, th, v) {
    const frame = v_flex().flex_none().gap(8).p(10).rounded(8).border_1().border_color(t.accent).bg(t.popover);
    if (this.mode === "route" || this.mode === "routeMsg") return this.renderRoute(t, th, v, frame);
    const { kind, itemId, event } = this.compose;
    const item = itemId && this.selectedItem(th, v);
    const title = kind === "review" ? `Review #${v.number}` : kind === "reply" ? `Reply to ${item?.author ?? "comment"}` : `Comment on #${v.number}`;
    let top = h_flex().gap(8).items_center().child(div().font_semibold().text_color(t.foreground).child(title));
    if (kind === "review") {
      top = top.children(github.REVIEW_EVENTS.map(([flag, label], i) => {
        const color = flag === "approve" ? t.ansi2 : flag === "request-changes" ? t.ansi1 : t.muted;
        const on = i === event;
        return div().id(`ev-${flag}`).px(8).h(22).rounded(11).flex().items_center().cursor_pointer().text_size(11.5)
          .bg(on ? color : t.raised).text_color(on ? t.background : t.muted)
          .on_click((_e, cx) => { this.compose.event = i; this.text.focus(); cx.notify(); })
          .child(label);
      }));
    }
    top = top.child(div().flex_1()).child(div().text_size(11).text_color(t.dim).child(kind === "review" ? "Tab kind · ⌘↵ send · Esc" : "⌘↵ send · Esc"));
    return frame.child(top).child(Textarea.new(this.text).w_full().text_size(12.5).text_color(t.foreground));
  }

  renderHelp(t) {
    const groups = [...new Set(KEYS.map((k) => k.group))];
    return v_flex().id("help").flex_1().min_h(0).gap(14).p(4).overflow_y_scrollbar()
      .child(div().text_size(14).font_semibold().text_color(t.foreground).child("Keys"))
      .child(h_flex().gap(28).items_start().flex_wrap().children(groups.map((g) => v_flex().gap(4).min_w(200)
        .child(div().text_size(10.5).font_semibold().text_color(t.dim).child(g.toUpperCase()))
        .children(KEYS.filter((k) => k.group === g).map((k) => h_flex().gap(8).items_center()
          .child(h_flex().gap(3).w(64).flex_none().children(k.keys.map((x) => this.keyChip(t, x))))
          .child(div().text_size(12).text_color(t.muted).child(k.label)))))))
      .child(div().text_size(11.5).text_color(t.dim).child("Dismissing marks a notification read, then removes it. Opening it, its diff or its space marks it read and keeps it. Any key closes this."));
  }

  renderFooter(t, th, v) {
    const kind = th ? kindOf(th, v) : null;
    const shown = KEYS.filter((k) => k.footer && (!k.kinds || k.kinds.includes(kind)));
    const msgColor = { error: t.ansi1, success: t.ansi2, warning: t.ansi3 }[this.msg?.level] ?? t.muted;
    return h_flex().flex_none().gap(12).items_center().pt(2)
      .children(shown.map((k) => h_flex().gap(5).items_center().child(this.keyChip(t, k.keys[0])).child(div().text_size(11.5).text_color(t.muted).child(k.label))))
      .child(div().flex_1())
      .when(!!this.msg, (el) => el.child(div().max_w(520).truncate().text_size(11.5).text_color(msgColor).child(this.msg.text)));
  }

  render() {
    const t = theme();
    this.links = linkIndex(sessions.listSessions());
    const groups = this.groups();
    const th = this.current();
    if (th) this.selId = th.id;
    const v = th && this.views[th.id];
    const total = this.threads.length;
    const fresh = this.threads.filter((x) => (this.views[x.id]?.newCount ?? 0) > 0).length;

    const detail = v_flex().flex_1().min_w(0).h_full().gap(12).p(16).rounded(10).bg(t.background).border_1().border_color(t.border);
    let right;
    if (this.mode === "help") right = detail.child(this.renderHelp(t));
    else if (!th) {
      right = detail.items_center().justify_center()
        .child(div().text_size(18).font_semibold().text_color(t.foreground).child(this.loading ? "Loading…" : total ? "No match" : "Inbox zero"))
        .child(div().text_size(12).text_color(t.dim).child(this.loading ? "" : total ? "Esc clears the filter" : "Nothing needs you on GitHub."));
    } else {
      right = detail
        .child(this.renderHeader(t, th, v))
        .child(v_flex().id(`tl-${th.id}`).flex_1().min_h(0).gap(2).overflow_y_scrollbar().track_scroll(this.detailScroll).children(this.renderBody(t, th, v)))
        .when(["compose", "route", "routeMsg"].includes(this.mode), (el) => el.child(this.renderComposer(t, th, v)));
    }

    return v_flex()
      .id("inbox")
      .track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .size_full()
      .p(16)
      .gap(12)
      .bg(t.popover)
      .text_size(13)
      .child(h_flex().flex_none().items_center().gap(10)
        .child(icon("icons-juan/gh-bell.svg", t.foreground, 16))
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child("GitHub inbox"))
        .child(div().text_size(12).text_color(t.dim).child(`${total}`))
        .when(fresh > 0, (el) => el.child(pill(t, `${fresh} with news`, t.accent_foreground, t.accent)))
        .child(div().flex_1())
        .when(this.loading, (el) => el.child(div().text_size(11.5).text_color(t.dim).child("refreshing…"))))
      .when(this.mode === "filter" || !!this.filter.value(), (el) => el.child(
        h_flex().h(32).flex_none().px(10).rounded(8).border_1().border_color(this.mode === "filter" ? t.accent : t.border).bg(t.background).items_center()
          .child(Input.new(this.filter).flex_1().h_full().text_size(12.5).text_color(t.foreground))))
      .child(h_flex().flex_1().min_h(0).gap(12).child(this.renderList(t, groups, th)).child(right))
      .child(this.renderFooter(t, th, v));
  }
}

function TextViewMarkdown(id, text) {
  return TextView.markdown(id, text.length > 6000 ? `${text.slice(0, 6000)}\n\n…` : text);
}
