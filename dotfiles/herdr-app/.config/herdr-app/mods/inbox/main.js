// GitHub inbox: notifications grouped by how much they need you, and for the
// selected one, what happened since you last looked. KEYS below is the one
// list of what every key does; the footer and the ? sheet are drawn from it.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, TextareaState, Textarea, ScrollHandle, TextView } from "gpui-base";
import { exec, spaces, home, run, theme, props, openOverlay, closeOverlay, shared, setShared, readTextFile, writeTextFile } from "herdr";
import * as github from "./github.js";
import * as sessions from "./sessions.js";
import { rank, describe, presets, blank, labelKey, linkIndex } from "./routing.js";
import { pickerRows, settle, move as movePick, renderPicker, PickerSearch, pickerKey } from "./session-picker.js";
import { REACTIONS } from "./thread.js";
import { HelpSearch } from "./help.js";
import { listRow, sectionHeader, timelineItem, look, icon, pill, ciMark, summaryText, when, scrollArea, labelChip, REASON } from "./ui.js";

const REFRESH_MS = 60_000;

const SECTIONS = [
  ["snoozed", "Snoozed sessions"],
  ["review", "Review requested"],
  ["mention", "Mentioned"],
  ["yours", "Yours"],
  ["talk", "Conversations"],
  ["other", "CI, releases & bots"],
];

// A thread that changed after its session was snoozed (dev herdr snooze sets
// juan.snooze=<time>) waits on Juan first: y wakes the session and sends it.
const snoozedAt = (link) => link?.labels?.["juan.snooze"] || null;

function sectionOf(th, v, link) {
  const since = snoozedAt(link);
  if (since && Date.parse(th.updated_at) > Date.parse(since)) return "snoozed";
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
  { keys: ["l"], label: "labels", group: "Respond", act: "label", kinds: ["pr", "issue"], footer: true },
  { keys: ["+"], label: "react", group: "Respond", act: "react", kinds: ["pr", "issue"] },
  { keys: ["m"], label: "merge", group: "Respond", act: "merge", kinds: ["pr"] },
  { keys: ["M"], label: "merge when checks pass", group: "Respond", act: "autoMerge", kinds: ["pr"] },
  { keys: ["x"], label: "close with comment", group: "Respond", act: "closeThread", kinds: ["pr", "issue"], footer: true },
  { keys: ["X"], label: "reopen with comment", group: "Respond", act: "reopenThread", kinds: ["pr", "issue"] },
  { keys: ["w"], label: "ready for review / draft", group: "Respond", act: "ready", kinds: ["pr"] },
  { keys: ["i"], label: "assign yourself", group: "Respond", act: "assign", kinds: ["pr", "issue"] },
  { keys: ["R"], label: "rerun failed", group: "Respond", act: "rerun", kinds: ["ci"], footer: true },
  { keys: ["y"], label: "wake and send", group: "Go", act: "wake", kinds: ["pr", "issue"], footer: true },
  { keys: ["p"], label: "send to a session", group: "Go", act: "route", footer: true },
  { keys: ["n"], label: "send to a new session here", group: "Go", act: "routeNew", footer: true },
  { keys: ["o", "enter"], label: "open", group: "Go", act: "open", footer: true },
  { keys: ["s"], label: "go to its session or space", group: "Go", act: "space" },
  { keys: ["Y"], label: "copy link", group: "Go", act: "copy" },
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
const isOpen = (v) => v.state === "open" || v.state === "draft";

// Puts what you just did at the end of the thread, until GitHub's version replaces it.
function addItem(view, fields) {
  view.newItems.push({
    id: `local-${Date.now()}-${view.newItems.length}`, nodeId: null, author: view.viewer, bot: false,
    at: new Date().toISOString(), url: null, reactions: [], ...fields,
  });
}

// Adds your reaction, or takes it back when it's already yours, as github.react does.
function toggleReaction(view, itemId, content, emoji) {
  const it = [view.description, ...view.newItems, ...view.olderItems].find((x) => x.id === itemId);
  if (!it) return;
  const r = it.reactions.find((x) => x.content === content);
  if (!r) it.reactions.push({ content, emoji, count: 1, mine: true });
  else if (r.mine) { r.count--; r.mine = false; }
  else { r.count++; r.mine = true; }
  it.reactions = it.reactions.filter((x) => x.count > 0);
}

// Tells the notices corner to count GitHub again.
// count: the threads still listed, after a dismiss.
const pokeNotices = (count) => setShared("notices.poke", { source: "github", at: Date.now(), count });

// Enter sends and Shift+Enter adds a line. The textarea inserts the newline
// before it reports Enter, so this keeps the text from before each change and
// puts it back before sending. Returns the setter to use instead of set_value,
// which reports no change; it leaves the caret at the end, to type after.
function enterSends(state, send) {
  let now = state.value();
  let before = now;
  state.on("change", () => { before = now; now = state.value(); });
  state.on("submit", (e, cx) => {
    if (e.shift || e.secondary) return;
    state.set_value(before);
    now = before;
    send(cx);
  });
  return (text) => {
    state.set_value(text);
    state.set_selected_range({ start: text.length, end: text.length });
    now = before = text;
  };
}

// Waits for a terminal to end; resolves with its exit code (null when unknown).
async function waitForEnd(address) {
  for (;;) {
    const w = await exec("hc", ["wait", address, "--json", "--timeout", "300"], { timeout: 330000 });
    const out = w.code === 0 ? JSON.parse(w.stdout) : null;
    if (!out || out.ended) return out?.exit_code ?? null;
  }
}

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
    this.mode = null; // "filter" | "compose" | "route" | "routeMsg" | "react" | "label" | "help"
    this.compose = null; // { kind: "comment" | "reply" | "review", threadId, itemId, event }
    this.draftKey = null;
    this.route = null; // { threadId, at, places, target, preset }
    this.labelPick = null; // { at, applied } while the label picker is open
    this.repoLabels = shared("inbox.labels") ?? {}; // repo → its labels
    this.labelQuery = InputState.new({ placeholder: "Label as…" });
    this.labelQuery.on("change", (_e, cx) => { if (this.labelPick) this.labelPick.at = 0; cx.notify(); });
    this.labelQuery.on("submit", (_e, cx) => this.toggleLabel(cx));
    this.labelScroll = ScrollHandle.new();
    this.confirm = null;
    this.msg = null;
    this.loading = false;
    this.pending = new Map(); // thread id → optimistic actions in flight
    this.handle = cx.focus_handle();
    this.listScroll = ScrollHandle.new();
    this.detailScroll = ScrollHandle.new();
    this.filter = InputState.new({ placeholder: "Filter by repo, title or reason…" });
    this.filter.on("change", (_e, cx) => cx.notify());
    this.filter.on("submit", (_e, cx) => this.endMode(cx));
    this.text = TextareaState.new({ rows: 4 });
    this.text.set_auto_grow(4, 14);
    this.setText = enterSends(this.text, (cx) => this.submit(cx));
    this.routeScroll = ScrollHandle.new();
    this.routeText = TextareaState.new({ rows: 4 });
    this.routeText.set_auto_grow(3, 10);
    this.setRouteText = enterSends(this.routeText, (cx) => this.sendRoute(cx));
    this.routeSearch = new PickerSearch(this.handle, {
      onChange: (_e, cx) => { if (this.route) this.route.at = -1; cx.notify(); },
      onSubmit: (_e, cx) => { if (this.mode === "route") this.pickTarget(cx); },
    });
    this.helpSearch = new HelpSearch(this.handle);
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
      groups.find((g) => g.key === sectionOf(th, this.views[th.id], this.linkFor(th))).threads.push(th);
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
        const stale = this.threads.filter((th) => this.views[th.id]?.key !== viewKey(th) && !this.pending.has(th.id));
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

  // Goes to a session or space outside the inbox, reporting progress in the status line.
  act(cx, label, fn) {
    this.flash(cx, `${label}…`);
    cx.spawn(async (cx) => {
      try {
        await fn();
        this.msg = { level: "success", text: label };
      } catch (e) {
        this.msg = { level: "error", text: `${label} failed: ${errorText(e)}` };
      }
      cx.notify();
    });
  }

  // Shows an action as done at once, then asks GitHub. apply(view) changes a
  // copy of the thread's view. On failure the view goes back (or reloads, when
  // another action changed it since), undo() puts back the rest, and the
  // status line says why. Once no action on the thread is in flight, it reloads
  // to show GitHub's version.
  optimistic(cx, label, request, { th, apply, undo } = {}) {
    const before = th && this.views[th.id];
    let after = null;
    if (before && apply) {
      after = JSON.parse(JSON.stringify(before));
      apply(after);
      this.views[th.id] = after;
      this.save();
    }
    if (th) this.pending.set(th.id, (this.pending.get(th.id) ?? 0) + 1);
    this.msg = { level: "success", text: label };
    cx.notify();
    cx.spawn(async (cx) => {
      let failed = false;
      try {
        await request();
      } catch (e) {
        failed = true;
        if (after && this.views[th.id] === after) this.views[th.id] = before;
        undo?.();
        this.msg = { level: "error", text: `${label} failed: ${errorText(e)}` };
        this.save();
        cx.notify();
      }
      if (!th) return;
      const left = this.pending.get(th.id) - 1;
      if (left) return this.pending.set(th.id, left);
      this.pending.delete(th.id);
      if (!after || (failed && this.views[th.id] === before)) return;
      await this.loadView(th);
      this.save();
      cx.notify();
    });
  }

  // Acting on a thread marks it read; it stays in the inbox until dismissed.
  markRead(cx, th) {
    if (!th?.unread) return;
    th.unread = false;
    this.save();
    cx.spawn(async (cx) => {
      try { await github.markRead(th); pokeNotices(); } catch (e) { th.unread = true; this.flash(cx, `Marking read failed: ${errorText(e)}`, "error"); }
    });
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
    const forget = () => { for (const id of ids) delete this.views[id]; this.save(); };
    const unsubscribe = label.startsWith("Unsubscribed");
    // The last one closes the inbox at once; herdr-core finishes the calls.
    if (!this.threads.length) {
      return this.optimistic(cx, label, async () => {
        await github.dismissInBackground(list, { unsubscribe });
        pokeNotices(0);
        forget();
        this.close();
      }, { undo: () => { Object.assign(this, before); this.save(); } });
    }
    this.optimistic(cx, label, async () => {
      await (unsubscribe ? github.unsubscribe(list[0]) : github.dismiss(list));
      pokeNotices(this.threads.length);
      forget();
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
      notification: th.id, repo: th.repo, number: v?.number ?? threadNumber(th), kind: kindOf(th, v), url: v?.url ?? github.webUrl(th, v),
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
    // Over the inbox, as Ctrl+G's Neovim: quitting deltoids comes back here.
    openOverlay({ kind: "dialog", modal: true, width: 0.9, height: 0.9, layout: { type: "block", content: { terminal: address } } });
    await waitForEnd(address);
    this.handle.focus();
  }

  async goToSpace(th) {
    const space = this.spaceFor(th.repo);
    const folder = space ? null : await sessions.cloneHere(th.repo);
    this.close();
    if (space) run("space.select", { id: space.id });
    else openOverlay({ mod: "new-space", props: { folder }, kind: "popup", width: 1, height: 1, frame: "none" });
  }

  // Ctrl+G: edits the draft in Neovim, in a terminal over the inbox, and takes
  // the text back when it quits. :cq keeps the draft as it was.
  editInNvim(cx, state, setText) {
    cx.spawn(async (cx) => {
      let dir = null;
      try {
        dir = (await exec("mktemp", ["-d", "-t", "herdr-inbox"])).stdout.trim();
        const file = `${dir}/draft.md`;
        await writeTextFile(file, state.value(), null);
        // zsh -ic: nvim and its config need the shell's PATH, which the core's environment lacks.
        const r = await exec("hc", ["run", "--json", "--bg", "--no-parent", "--rm", "--cwd", home(), "--", "zsh", "-ic", 'exec nvim "$1"', "zsh", file]);
        if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim());
        const { address } = JSON.parse(r.stdout);
        openOverlay({ kind: "dialog", modal: true, width: 0.8, height: 0.8, layout: { type: "block", content: { terminal: address } } });
        const exit = await waitForEnd(address);
        const text = await readTextFile(file);
        if (!exit && text !== null) setText(text.replace(/\n+$/, ""));
      } catch (e) {
        this.msg = { level: "error", text: `Neovim failed: ${errorText(e)}` };
      } finally {
        if (dir) exec("rm", ["-rf", dir]);
      }
      state.focus();
      cx.notify();
    });
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
      this.setText(value);
      this.draftKey = key;
    }
    this.compose = { kind, threadId: th.id, itemId: item?.id ?? null, event: 0 };
    this.mode = "compose";
    this.text.focus();
    cx.notify();
  }

  // The kinds Tab cycles through in the composer, or null.
  composeChoices(v) {
    if (this.compose?.kind === "review") return github.REVIEW_EVENTS;
    if (this.compose?.kind === "close" && v?.kind === "issue") return github.CLOSE_REASONS;
    return null;
  }

  // ---- Labels: a picker like Gmail's, filtered as you type ----

  openLabels(cx, th, v) {
    // The labels applied when the picker opens come first, and stay where
    // they are while you add and remove labels.
    this.labelPick = { at: 0, applied: new Set(v.labels) };
    this.mode = "label";
    this.labelQuery.set_value("");
    this.labelQuery.focus();
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        this.repoLabels[th.repo] = await github.repoLabels(th.repo);
        setShared("inbox.labels", this.repoLabels);
      } catch (e) {
        if (!this.repoLabels[th.repo]) this.flash(cx, `Loading labels failed: ${errorText(e)}`, "error");
      }
      cx.notify();
    });
  }

  // A label's "#rrggbb": from the thread, else the repository's labels, else the theme.
  labelColor(th, v, name) {
    const hex = v?.labelColors?.[name] ?? this.repoLabels[th.repo]?.find((l) => l.name === name)?.color;
    return hex ? `#${hex}` : theme().ansi5;
  }

  labelList(th) {
    const q = this.labelQuery.value().trim().toLowerCase();
    const applied = this.labelPick?.applied ?? new Set();
    const all = [...(this.repoLabels[th.repo] ?? [])].sort((a, b) => applied.has(b.name) - applied.has(a.name));
    return q ? all.filter((l) => l.name.toLowerCase().includes(q)) : all;
  }

  toggleLabel(cx) {
    const th = this.current();
    const v = th && this.views[th.id];
    const label = th && this.labelList(th)[this.labelPick?.at ?? 0];
    if (!v || !label) return;
    const { name } = label;
    const has = v.labels.includes(name);
    this.markRead(cx, th);
    this.optimistic(cx, has ? `Removed ${name}` : `Labelled ${name}`, () => (has ? github.removeLabel(v, name) : github.addLabel(v, name)), {
      th, apply: (view) => {
        view.labels = has ? view.labels.filter((l) => l !== name) : [...view.labels, name];
        view.labelColors = { ...view.labelColors, [name]: label.color };
        addItem(view, { kind: "labels", added: has ? [] : [name], removed: has ? [name] : [] });
      },
    });
  }

  endMode(cx) {
    if (this.mode === "filter" && !this.filter.value().trim()) this.filter.set_value("");
    this.mode = null;
    this.compose = null;
    this.route = null;
    this.labelPick = null;
    this.handle.focus();
    cx.notify();
  }

  // ---- Routing: pick a target, then write the message ----

  startRoute(cx, th) {
    this.route = { threadId: th.id, at: -1, places: null, target: null, preset: 0 };
    this.mode = "route";
    this.routeSearch.reset();
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

  // n: a new session on this computer, in the repo's space there, else in its
  // clone there, else in a fresh clone; straight to the message. Esc goes back
  // to the picker.
  startNewSession(cx, th) {
    this.flash(cx, "Finding the repo on this computer…");
    cx.spawn(async (cx) => {
      let places;
      try { places = await sessions.listPlaces(th.repo); } catch { places = []; }
      if (this.mode || this.current()?.id !== th.id) return;
      const here = { kind: "clone-here", repo: th.repo };
      const place = places.find((p) => (p.kind === "space" ? p.space.machine : p.machine) == null) ?? here;
      this.msg = null;
      this.route = { threadId: th.id, at: -1, places: places.length ? places : [here], target: { kind: "place", place }, preset: 0 };
      this.mode = "routeMsg";
      this.routeSearch.reset();
      this.setRouteText(this.routePresets(th, this.views[th.id])[0].text);
      this.routeText.focus();
      cx.notify();
    });
  }

  // The picker's rows: every session as the sidebar lists it, then the places
  // to start one, filtered by the search. It starts on the session that fits
  // the thread best.
  routeRows(th, v) {
    const subject = this.subjectOf(th, v);
    const ranked = rank(sessions.listSessions(), subject).filter((r) => r.why);
    this.route.why = new Map(ranked.map((r) => [r.session.address, r.why]));
    const starts = (this.route.places ?? []).map((place) => ({ ...describe({ kind: "place", place }, subject), value: place }));
    const rows = pickerRows(starts, this.routeSearch.value());
    if (this.route.at < 0 || !rows[this.route.at]) {
      const best = ranked[0] && rows.findIndex((r) => r.kind === "session" && r.agent.address === ranked[0].session.address);
      this.route.at = best >= 0 ? best : settle(rows);
      this.routeScroll.scroll_to_item(this.route.at);
    }
    return rows;
  }

  routePresets(th, v) {
    const subject = this.subjectOf(th, v);
    const target = this.route?.target;
    const linkedAt = target?.kind === "session" && target.why === "linked" ? target.session.labels[labelKey(subject)] : null;
    return [blank(subject), ...presets(subject, { linkedAt })];
  }

  pickTarget(cx, i = this.route?.at) {
    const th = this.current();
    const v = th && this.views[th.id];
    if (!th || !this.route) return;
    const row = this.routeRows(th, v)[i];
    let target;
    if (row?.kind === "start") target = { kind: "place", place: row.value };
    else if (row?.kind === "session") {
      const session = sessions.listSessions().find((x) => x.address === row.agent.address);
      if (!session) return;
      target = { kind: "session", session, why: this.route.why.get(session.address) ?? null, blocked: session.status === "blocked" };
    } else return;
    if (target.blocked) return this.flash(cx, `${target.session.name} needs you first: answer it, then send`, "warning");
    this.route.at = i;
    this.route.target = target;
    this.route.preset = 0;
    this.setRouteText(this.routePresets(th, v)[0].text);
    this.mode = "routeMsg";
    this.routeSearch.stop();
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
    // Once the session has the thread, the dialog closes and the session shows,
    // as in mail. A failure keeps the message open.
    this.flash(cx, target.kind === "session" ? `Sending to ${title}…` : `${title}…`);
    cx.spawn(async (cx) => {
      try {
        if (target.kind === "session") await sessions.send(target.session, text, subject);
        else await sessions.start(target.place, text, subject);
      } catch (e) {
        return this.flash(cx, `${title} failed: ${errorText(e)}`, "error");
      }
      if (th.unread) {
        th.unread = false;
        this.save();
        await github.markRead(th).then(() => pokeNotices(), () => {});
      }
      if (target.kind === "session") run("pane.focus", { pane: target.session.pane });
      this.close();
    });
  }

  submit(cx) {
    const th = this.current();
    const v = th && this.views[th.id];
    if (!th || !v || this.mode !== "compose") return;
    const body = this.text.value().trim();
    const { kind, event } = this.compose;
    if (kind === "review" && github.REVIEW_EVENTS[event][0] !== "approve" && !body) return this.flash(cx, `${github.REVIEW_EVENTS[event][1]} needs a comment`);
    if ((kind === "comment" || kind === "reply") && !body) return;
    // The draft clears at once and comes back if GitHub refuses it.
    const draftKey = this.draftKey;
    this.setText("");
    this.draftKey = null;
    const undo = () => {
      if (this.draftKey && this.draftKey !== draftKey) return;
      this.setText(body);
      this.draftKey = draftKey;
    };
    const said = (view) => { if (body) addItem(view, { kind: "comment", body }); };
    this.markRead(cx, th);
    if (kind === "close") {
      const [reason, label] = github.CLOSE_REASONS[event];
      this.optimistic(cx, `Closed #${v.number}${v.kind === "issue" ? ` as ${label.toLowerCase()}` : ""}`, () => github.close(v, reason, body), {
        th, undo, apply: (view) => {
          said(view);
          view.state = view.kind === "pr" ? "closed" : reason;
          addItem(view, { kind: "event", event: reason === "not planned" ? "closed as not planned" : "closed" });
        },
      });
    } else if (kind === "reopen") {
      this.optimistic(cx, `Reopened #${v.number}`, () => github.reopen(v, body), {
        th, undo, apply: (view) => {
          view.state = "open";
          addItem(view, { kind: "event", event: "reopened" });
          said(view);
        },
      });
    } else if (kind === "review") {
      const [flag, label] = github.REVIEW_EVENTS[event];
      const state = { approve: "APPROVED", "request-changes": "CHANGES_REQUESTED", comment: "COMMENTED" }[flag];
      this.optimistic(cx, `${label === "Comment" ? "Reviewed" : label === "Approve" ? "Approved" : "Requested changes on"} #${v.number}`, () => github.review(v, flag, body), {
        th, undo, apply: (view) => addItem(view, { kind: "review", state, body, inline: 0, reactions: [] }),
      });
    } else {
      this.optimistic(cx, `${kind === "reply" ? "Replied on" : "Commented on"} #${v.number}`, () => github.comment(v, body), { th, undo, apply: said });
    }
    this.endMode(cx);
  }

  // ---- Keys ----

  key(e, cx) {
    const k = keyName(e);
    const th = this.current();
    const v = th && this.views[th.id];

    if (this.mode === "label") {
      const n = this.labelList(th).length || 1;
      if (k === "escape") this.endMode(cx);
      else if (k === "down" || k === "ctrl-n") { this.labelPick.at = (this.labelPick.at + 1) % n; cx.notify(); }
      else if (k === "up" || k === "ctrl-p") { this.labelPick.at = (this.labelPick.at + n - 1) % n; cx.notify(); }
      else return;
      return cx.stop_propagation();
    }
    if (this.mode === "route") {
      const act = pickerKey(this.routeSearch, k);
      if (k === "escape") { if (this.routeSearch.stop()) cx.notify(); else this.endMode(cx); }
      else if (act.search) { this.routeSearch.start(); cx.notify(); }
      else if (act.pick) this.pickTarget(cx);
      else if (act.move) {
        const rows = this.routeRows(th, v);
        this.route.at = movePick(rows, this.route.at, act.move);
        this.routeScroll.scroll_to_item(this.route.at);
        cx.notify();
      } else return;
      return cx.stop_propagation();
    }
    if (this.mode === "routeMsg") {
      if (k === "escape") {
        this.mode = "route";
        this.handle.focus();
        cx.notify();
      } else if (k === "ctrl-g") this.editInNvim(cx, this.routeText, this.setRouteText);
      else if (k === "tab") {
        const list = this.routePresets(th, v);
        this.route.preset = (this.route.preset + 1) % list.length;
        this.setRouteText(list[this.route.preset].text);
        cx.notify();
      } else return;
      return cx.stop_propagation();
    }
    if (this.mode === "compose") {
      if (k === "escape") this.endMode(cx);
      else if (k === "ctrl-g") this.editInNvim(cx, this.text, this.setText);
      else if (k === "tab" && this.composeChoices(v)) {
        this.compose.event = (this.compose.event + 1) % this.composeChoices(v).length;
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
        if (item && !item.nodeId) this.flash(cx, `Your ${item.kind} is still on its way to GitHub`);
        else if (item) {
          this.markRead(cx, th);
          this.optimistic(cx, `${emoji} on ${item.author === v.viewer ? "your" : `${item.author}'s`} ${item.kind}`, () => github.react(item, content), {
            th, apply: (view) => toggleReaction(view, item.id, content, emoji),
          });
        }
      }
      return this.endMode(cx);
    }
    if (this.mode === "help") {
      if (k === "escape") {
        cx.stop_propagation();
        return this.helpSearch.stop() ? cx.notify() : this.endMode(cx);
      }
      const act = this.helpSearch.key(k);
      if (act === "type") return;
      cx.stop_propagation();
      if (act === "search") { this.helpSearch.start(); return cx.notify(); }
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
        this.helpSearch.reset();
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
        this.markRead(cx, th);
        return this.flash(cx, "Opened in the browser");
      }
      case "copy": {
        const url = github.webUrl(th, v, v && this.selectedItem(th, v));
        return this.optimistic(cx, "Copied the link", async () => {
          const r = await exec("sh", ["-c", 'printf %s "$1" | pbcopy', "sh", url]);
          if (r.code !== 0) throw new Error(r.stderr.trim() || "pbcopy failed");
        });
      }
      case "space": {
        const linked = this.linkFor(th);
        if (!linked) return this.act(cx, "Going to the space", () => this.goToSpace(th));
        // A snoozed session comes back first: the focus change then redraws the tab bar without it hidden.
        return this.act(cx, `Going to ${linked.name}`, async () => {
          await sessions.wake(linked);
          run("pane.focus", { terminal: linked.address });
          this.close();
        });
      }
      case "wake": {
        // "Say yes": the New activity message, no picker, no editor.
        const linked = this.linkFor(th);
        if (!snoozedAt(linked)) return this.flash(cx, "Not linked to a snoozed session: p sends it", "warning");
        const subject = this.subjectOf(th, v);
        const text = presets(subject, { linkedAt: linked.labels[labelKey(subject)] })[0].text;
        this.markRead(cx, th);
        return this.optimistic(cx, `Woke ${linked.name}`, () => sessions.send(linked, text, subject));
      }
      case "route":
        return this.startRoute(cx, th);
      case "routeNew":
        return this.startNewSession(cx, th);
    }
    if (!needView()) return;
    const item = this.selectedItem(th, v);
    switch (act) {
      case "review": return this.startCompose(cx, "review", th, v);
      case "comment": return this.startCompose(cx, "comment", th, v);
      case "reply":
        if (!item || !REACTABLE.has(item.kind)) return this.flash(cx, "Select a comment to reply to (J/K)");
        return this.startCompose(cx, "reply", th, v, item);
      case "label": return this.openLabels(cx, th, v);
      case "react":
        if (!item || !REACTABLE.has(item.kind)) return this.flash(cx, "Select a comment to react to (J/K)");
        this.mode = "react";
        return cx.notify();
      case "diff":
        this.markRead(cx, th);
        this.flash(cx, "Opening the diff…");
        return cx.spawn(async (cx) => {
          try {
            await this.openDiff(th, v);
            this.msg = null;
          } catch (e) {
            this.msg = { level: "error", text: `Opening the diff failed: ${errorText(e)}` };
          }
          cx.notify();
        });
      case "merge":
        if (v.state !== "open") return this.flash(cx, `#${v.number} is ${v.state}`);
        this.markRead(cx, th);
        return this.optimistic(cx, `Merged #${v.number}`, () => github.merge(v), {
          th, apply: (view) => { view.state = "merged"; addItem(view, { kind: "event", event: "merged" }); },
        });
      case "autoMerge":
        if (v.state !== "open") return this.flash(cx, `#${v.number} is ${v.state}`);
        this.markRead(cx, th);
        return this.optimistic(cx, `#${v.number} merges when its checks pass`, () => github.merge(v, { auto: true }), { th });
      case "closeThread":
        if (!isOpen(v)) return this.flash(cx, `#${v.number} is ${v.state}`);
        return this.startCompose(cx, "close", th, v);
      case "reopenThread":
        if (isOpen(v) || v.state === "merged") return this.flash(cx, `#${v.number} is ${v.state}`);
        return this.startCompose(cx, "reopen", th, v);
      case "ready": {
        if (!isOpen(v)) return this.flash(cx, `#${v.number} is ${v.state}`);
        const ready = v.state === "draft";
        this.markRead(cx, th);
        return this.optimistic(cx, ready ? `#${v.number} is ready for review` : `#${v.number} is a draft`, () => github.setReady(v, ready), {
          th, apply: (view) => {
            view.state = ready ? "open" : "draft";
            addItem(view, { kind: "event", event: ready ? "marked ready for review" : "converted to draft" });
          },
        });
      }
      case "assign":
        this.markRead(cx, th);
        return this.optimistic(cx, `Assigned you to #${v.number}`, () => github.assignMe(v), {
          th, apply: (view) => addItem(view, { kind: "event", event: `assigned ${view.viewer}` }),
        });
      case "rerun":
        if (!v.run) return this.flash(cx, "No workflow run found for this notification");
        this.markRead(cx, th);
        return this.optimistic(cx, `Rerunning failed jobs of ${v.run.workflow}`, () => github.rerunFailed(v), {
          th, apply: (view) => { view.run.conclusion = "queued"; },
        });
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
        children.push(listRow(t, th, this.views[th.id], th.id === sel?.id, this.linkFor(th), (name) => this.labelColor(th, this.views[th.id], name))
          .on_click((_e, cx) => { this.selId = th.id; this.msg = null; this.handle.focus(); cx.notify(); }));
      }
    });
    return scrollArea(div().w(460).flex_none().h_full(), "inbox-list", v_flex().gap(1).track_scroll(this.listScroll).children(children));
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
    for (const name of v?.labels ?? []) line = line.child(labelChip(t, name, this.labelColor(th, v, name)));

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
        .child(snoozedAt(linked)
          ? div().text_color(t.dim).child("● snoozed")
          : div().text_color(t[linked.status] ?? t.dim).child(`● ${STATUS_WORD[linked.status] ?? linked.status}`))
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
    const list = this.routePresets(th, v);
    const { title, detail } = describe(this.route.target, subject);
    return frame
        .child(h_flex().gap(8).items_center()
          .child(div().flex_none().font_semibold().text_color(t.foreground).child(`To ${title}`))
          .child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(t.dim).child(detail))
          .child(div().flex_none().text_size(11).text_color(t.dim).child("Tab preset · ↵ send · ⇧↵ newline · ⌃G nvim · Esc back")))
        .child(h_flex().gap(6).flex_wrap().children(list.map((p, i) => {
          const on = i === this.route.preset;
          return div().id(`pre-${p.id}`).px(8).h(22).rounded(11).flex().items_center().cursor_pointer().text_size(11.5)
            .bg(on ? t.accent : t.raised).text_color(on ? t.accent_foreground : t.muted)
            .on_click((_e, cx) => { this.route.preset = i; this.setRouteText(p.text); this.routeText.focus(); cx.notify(); })
            .child(p.label);
        })))
        .child(Textarea.new(this.routeText).w_full().text_size(12.5).text_color(t.foreground));
  }

  renderLabelPicker(t, th, v) {
    const list = this.labelList(th);
    const at = Math.min(this.labelPick.at, Math.max(0, list.length - 1));
    const rows = list.map((label, i) => {
      const on = v.labels.includes(label.name);
      return h_flex().id(`label-${i}`).flex_none().gap(8).px(10).h(28).rounded(6).items_center().cursor_pointer()
        .when(i === at, (el) => el.bg(t.raised))
        .on_click((_e, cx) => { this.labelPick.at = i; this.toggleLabel(cx); this.labelQuery.focus(); })
        .child(div().flex_none().size(14).rounded(3).border_1().border_color(on ? t.ansi5 : t.border).bg(on ? t.ansi5 : t.background)
          .flex().items_center().justify_center().text_size(10).text_color(t.background).child(on ? "✓" : ""))
        .child(div().flex_none().size(10).rounded(5).bg(`#${label.color}`))
        .child(div().flex_none().text_color(on ? t.foreground : t.muted).child(label.name))
        .when(Boolean(label.description), (el) => el.child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(t.dim).child(label.description)));
    });
    if (list.length) this.labelScroll.scroll_to_item(at);
    const loaded = this.repoLabels[th.repo];
    return v_flex().flex_1().min_h(0).gap(10)
      .child(h_flex().flex_none().gap(8).items_center()
        .child(icon("icons-juan/gh-tag.svg", t.ansi5, 16))
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Label as")))
      .child(h_flex().h(32).flex_none().px(10).rounded(8).border_1().border_color(t.accent).bg(t.background).items_center()
        .child(Input.new(this.labelQuery).flex_1().h_full().text_size(12.5).text_color(t.foreground)))
      .child(!loaded ? div().text_color(t.dim).child("Loading labels…")
        : !list.length ? div().text_color(t.dim).child(this.labelQuery.value().trim() ? "No match" : "This repository has no labels")
        : scrollArea(div().flex_1().min_h(0), "labels", v_flex().gap(1).track_scroll(this.labelScroll).children(rows)))
      .child(div().flex_none().text_size(11.5).text_color(t.dim).child("↑↓ choose · ↵ add or remove · Esc back"));
  }

  renderRoutePicker(t, th, v) {
    const rows = this.routeRows(th, v);
    const WHY = { linked: "handles this", branch: "on this branch", repo: "in repo" };
    return renderPicker(t, rows, this.route.at, {
      title: "Send to a session",
      subtitle: this.route.places === null ? "looking for clones on your machines…" : "",
      footer: this.routeSearch.active
        ? "↑↓ or ⌃j/⌃k choose · ↵ write the message · Esc clear search"
        : "j/k choose · / search · ↵ write the message · Esc back",
      scroll: this.routeScroll,
      search: this.routeSearch,
      note: (r) => WHY[this.route.why?.get(r.agent.address)] ?? null,
      onPick: (i, cx) => this.pickTarget(cx, i),
    });
  }

  renderComposer(t, th, v) {
    const frame = v_flex().flex_none().gap(8).p(10).rounded(8).border_1().border_color(t.accent).bg(t.popover);
    if (this.mode === "routeMsg") return this.renderRoute(t, th, v, frame);
    const { kind, itemId, event } = this.compose;
    const item = itemId && this.selectedItem(th, v);
    const title = {
      review: `Review #${v.number}`, reply: `Reply to ${item?.author ?? "comment"}`, comment: `Comment on #${v.number}`,
      close: `Close #${v.number}`, reopen: `Reopen #${v.number}`,
    }[kind];
    const choices = this.composeChoices(v);
    let top = h_flex().gap(8).items_center().child(div().font_semibold().text_color(t.foreground).child(title));
    if (choices) {
      top = top.children(choices.map(([flag, label], i) => {
        const color = flag === "approve" ? t.ansi2 : flag === "request-changes" ? t.ansi1 : t.muted;
        const on = i === event;
        return div().id(`ev-${flag}`).px(8).h(22).rounded(11).flex().items_center().cursor_pointer().text_size(11.5)
          .bg(on ? color : t.raised).text_color(on ? t.background : t.muted)
          .on_click((_e, cx) => { this.compose.event = i; this.text.focus(); cx.notify(); })
          .child(label);
      }));
    }
    const optional = kind === "close" || kind === "reopen" ? "comment optional · " : "";
    top = top.child(div().flex_1()).child(div().text_size(11).text_color(t.dim).child(`${choices ? "Tab kind · " : ""}${optional}↵ send · ⇧↵ newline · ⌃G nvim · Esc`));
    return frame.child(top).child(Textarea.new(this.text).w_full().text_size(12.5).text_color(t.foreground));
  }

  renderHelp(t) {
    const keys = this.helpSearch.filter(KEYS);
    const groups = [...new Set(keys.map((k) => k.group))];
    const box = this.helpSearch.box(t, keys.length);
    return scrollArea(div().flex_1().min_h(0), "help", v_flex().gap(14).p(4)
      .child(div().text_size(14).font_semibold().text_color(t.foreground).child("Keys"))
      .when(!!box, (el) => el.child(box))
      .child(h_flex().gap(28).items_start().flex_wrap().children(groups.map((g) => v_flex().gap(4).min_w(200)
        .child(div().text_size(10.5).font_semibold().text_color(t.dim).child(g.toUpperCase()))
        .children(keys.filter((k) => k.group === g).map((k) => h_flex().gap(8).items_center()
          .child(h_flex().gap(3).w(64).flex_none().children(k.keys.map((x) => this.keyChip(t, x))))
          .child(div().text_size(12).text_color(t.muted).child(k.label)))))))
      .child(div().text_size(11.5).text_color(t.dim).child("The inbox lists every notification not marked done; acting on one marks it read. Dismissing marks it done on GitHub. / searches the keys; any other key closes this.")));
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
    } else if (this.mode === "route") {
      right = detail.child(this.renderHeader(t, th, v)).child(this.renderRoutePicker(t, th, v));
    } else if (this.mode === "label") {
      right = detail.child(this.renderHeader(t, th, v)).child(this.renderLabelPicker(t, th, v));
    } else {
      right = detail
        .child(this.renderHeader(t, th, v))
        .child(scrollArea(div().flex_1().min_h(0), `tl-${th.id}`, v_flex().gap(2).track_scroll(this.detailScroll).children(this.renderBody(t, th, v))))
        .when(["compose", "routeMsg"].includes(this.mode), (el) => el.child(this.renderComposer(t, th, v)));
    }

    return v_flex()
      .id("inbox")
      .track_focus(this.handle)
      // Escape is Herdr's overlay.close binding, which runs before key
      // handlers: while a mode is open it goes back one step, as Escape in key() does.
      .when(Boolean(this.mode), (el) => el.on_action("overlay.close", (_e, cx) => this.key({ key: "escape", modifiers: {} }, cx)))
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
