// Slack in a dialog: channels and direct messages on the left, the open
// conversation or thread on the right, a composer below it. It signs in with
// the Slack desktop app's session (`slack-session`) and draws the last state
// from ~/.cache/herdr-slack at once; while it is closed, the notices mod
// refreshes that cache when Slack has new messages (slack-cache.js). Live events come from `slack-events`, a
// local bridge that holds Slack's real-time socket (it needs the session
// cookie, which a mod's websocket can't send) and relays it over TCP; the mod
// starts it when it isn't running. While the bridge is down, the mod polls
// client.counts every few seconds instead: one small call that says which
// conversations have new messages, so only those load again. KEYS is the list
// of what every key does; the footer and the ? sheet are drawn from it.

import { View, div, image } from "gpui-kit";
import {
  v_flex, h_flex, Scrollbar, v_virtual_list, VirtualListScrollHandle, ScrollHandle,
  InputState, Input, TextareaState, Textarea, TextView,
} from "gpui-base";
import { exec, theme, props, closeOverlay, home, appHome, readTextFile, writeTextFile, window, setShared } from "herdr";
import net from "net";
import { createSlack } from "./slack.js";
import { CACHE_DIR, CACHE_FILE, CACHE_VERSION, CACHED_HISTORIES, newer, hashOf, compact, conversation } from "./slack-cache.js";
import { toMarkdown, plain, emoji, EMOJI_NAMES } from "./format.js";
import { HelpSearch } from "./help.js";

const KEYS = [
  { keys: ["j", "down"], label: "next conversation / message", group: "Move", act: "next" },
  { keys: ["k", "up"], label: "previous conversation / message", group: "Move", act: "prev" },
  { keys: ["u"], label: "next unread conversation", group: "Move", act: "unread", footer: true },
  { keys: ["/", "ctrl-k"], label: "find a conversation or person", group: "Move", act: "find", footer: true },
  { keys: ["l", "right"], label: "into the messages", group: "Move", act: "messages", pane: "list" },
  { keys: ["h", "left"], label: "back to the conversations", group: "Move", act: "list", pane: "messages" },
  { keys: ["i", "enter"], label: "write a message", group: "Write", act: "write", pane: "list", footer: true },
  { keys: ["i"], label: "write a message", group: "Write", act: "write", pane: "messages", footer: true },
  { keys: ["t", "enter"], label: "open the thread", group: "Write", act: "thread", pane: "messages", footer: true },
  { keys: ["r"], label: "reply in the thread", group: "Write", act: "reply", pane: "messages", footer: true },
  { keys: ["e"], label: "react to the selected or last message", group: "Write", act: "react", footer: true },
  { keys: ["d"], label: "close a DM, or leave a channel (d twice)", group: "Move", act: "closeConv", footer: true },
  { keys: ["o"], label: "open in Slack", group: "Other", act: "open" },
  { keys: ["Y"], label: "copy link", group: "Other", act: "copy" },
  { keys: ["ctrl-r"], label: "reload", group: "Other", act: "reload" },
  { keys: ["?"], label: "all keys", group: "Other", act: "help", footer: true },
  { keys: ["q", "escape"], label: "close, or back one step", group: "Other", act: "close" },
];
const KEY_LABEL = { down: "↓", up: "↑", left: "←", right: "→", enter: "↵", escape: "Esc", "ctrl-r": "⌃R", "ctrl-k": "⌃K" };

const ROW = { section: 32, conv: 34 };
const POLL_MS = 4000;
const LIVE_POLL_MS = 60_000; // catching up on what the live events missed
const EVENTS_PORT = 47613; // slack-events
const REACTION_CHOICES = 12;
const STALE_MS = 60_000; // reload an open conversation this often for edits and reactions
const USERS_MS = 6 * 3600_000;
// Avatars are pictures in the app home, since image() reads nowhere else.
const AVATARS = "data/slack-avatars";
const IMAGES = "data/slack-images";
const IMAGE_BOX = { w: 400, h: 300 };
const GROUP_GAP = 5 * 60; // seconds between messages that still share an author line
// Slack's own senders, which users.list leaves out.
const SYSTEM = { USLACKBOT: "Slackbot", USLACK: "Slack" };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The session outlives the dialog: reading it again on every open costs a
// keychain call. Only a finished read is kept, so a dialog closed mid-read
// leaves nothing half done.
let session = null;
let pendingIds = 0;

// The notices corner counts what needs Juan in Slack; a poke makes it ask
// again within seconds after a conversation is read.
const pokeNotices = () => setShared("notices.poke", { source: "slack", at: Date.now() });

function keyName(e) {
  const m = e.modifiers ?? {};
  if (m.control) return `ctrl-${e.key}`;
  if (m.platform) return `cmd-${e.key}`;
  if (["down", "up", "left", "right", "enter", "escape"].includes(e.key)) return e.key;
  return e.key_char || e.key;
}

const errorText = (e) => String(e?.message ?? e);
// Theme colors are #rrggbb; a suffix makes a translucent tint of one.
const alpha = (c, a) => (/^#[0-9a-f]{6}$/i.test(c ?? "") ? `${c}${a}` : c);
const initials = (name) => String(name ?? "?").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => [...w][0]).join("").toUpperCase() || "?";

function ago(ts) {
  const s = Date.now() / 1000 - Number(ts);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
const tsDate = (ts) => new Date(Number(ts) * 1000);
const pad = (n) => String(n).padStart(2, "0");
const clock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function dayLabel(d) {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400_000);
  if (dayKey(d) === dayKey(today)) return "Today";
  if (dayKey(d) === dayKey(yesterday)) return "Yesterday";
  const year = d.getFullYear() === today.getFullYear() ? "" : ` ${d.getFullYear()}`;
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}${year}`;
}

// Fits a picture in IMAGE_BOX, keeping its shape; one without a size gets a
// middling box.
function fit(img) {
  if (!img.w || !img.h) return { w: 240, h: 180 };
  const scale = Math.min(1, IMAGE_BOX.w / img.w, IMAGE_BOX.h / img.h);
  return { w: Math.max(24, Math.round(img.w * scale)), h: Math.max(24, Math.round(img.h * scale)) };
}

function person(u) {
  return {
    id: u.id, handle: u.name, deleted: Boolean(u.deleted), bot: Boolean(u.is_bot),
    name: u.profile?.display_name || u.profile?.real_name || u.real_name || u.name,
    full: u.profile?.real_name || u.real_name || "",
    avatar: u.profile?.image_72 || null,
    avatarKey: `${u.id}-${u.profile?.avatar_hash ?? "x"}`,
  };
}

// Enter sends and Shift+Enter adds a line, as in the Linear and GitHub dialogs.
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

export default class Slack extends View {
  init(_props, cx) {
    this.client = null;
    this.me = null; // { userId, teamId, team, url }
    this.convs = new Map(); // id → conversation
    this.users = new Map(); // id → person
    this.byHandle = new Map(); // handle → person
    this.bots = {}; // bot id → { name, icon }, asked of bots.info once
    this.avatars = null; // keys of the pictures in AVATARS, once listed
    this.avatarQueue = new Map(); // key → url, waiting for the next download
    this.downloading = false;
    this.pictures = null; // file names in IMAGES, once listed
    this.pictureQueue = new Map(); // file name → url
    this.fetchingPictures = false;
    this.usersAt = 0;
    this.counts = {}; // id → { latest, lastRead, unread, mentions }
    this.histories = new Map(); // id → { messages (oldest first), at }
    this.threads = new Map(); // `${channel}:${ts}` → { messages, at }
    this.opened = new Set(); // DMs opened in this dialog, listed even when Slack calls them closed
    this.current = null; // the conversation shown
    this.thread = null; // { channel, ts } while a thread is shown
    this.pane = "list"; // which side j and k move in
    this.msgAt = null; // the selected message's index in the shown messages
    this.loading = false;
    this.loadError = null;
    this.note = null;
    this.help = false;
    this.composing = false;
    this.findAt = 0;
    this.finding = false;
    this.reacting = null; // the key of the message the reaction picker is open on
    this.reactAt = 0;
    this.reactSearching = false;
    this.wanted = null;
    this.fetching = false;
    this.polling = false;
    this.polledAt = 0;
    this.live = false; // slack-events relays Slack's real-time socket
    this.sock = null;
    this.marked = new Map(); // conversation → the ts last marked read
    this.md = new Map(); // `${ts}:${edited}` → markdown
    this.sentKeys = new Map(); // ts of a sent message → the id it had while pending

    this.handle = cx.focus_handle();
    this.helpSearch = new HelpSearch(this.handle);
    this.find = InputState.new({ placeholder: "Jump to a channel or person…" });
    this.find.on("change", (_e, cx) => { this.findAt = 0; cx.notify(); });
    this.find.on("submit", (_e, cx) => this.pickFound(cx));
    this.reactQuery = InputState.new({ placeholder: "Search emoji…" });
    this.reactQuery.on("change", (_e, cx) => { this.reactAt = 0; cx.notify(); });
    this.reactQuery.on("submit", (_e, cx) => this.pickReaction(cx));
    this.composer = TextareaState.new({ placeholder: "Write a message (i)", rows: 1 });
    this.composer.set_auto_grow(1, 10);
    this.composer.on("focus", (_e, cx) => { this.composing = true; cx.notify(); });
    this.composer.on("blur", (_e, cx) => { this.composing = false; cx.notify(); });
    this.setComposer = enterSends(this.composer, (cx) => this.send(cx));
    this.listScroll = VirtualListScrollHandle.new();
    this.msgScroll = ScrollHandle.new();
    this.findScroll = ScrollHandle.new();

    // While the dialog is open, it keeps the cache, so notices leaves it alone.
    setShared("slack.open", true);
    cx.timer.after(0, () => this.handle.focus());
    cx.timer.every(POLL_MS, (cx) => this.poll(cx));
    cx.spawn(async (cx) => {
      if (await this.readCache()) {
        this.scrollToEnd();
        cx.notify();
      }
      await this.connect(cx);
    });
    cx.spawn(async (cx) => this.listen(cx));
  }

  async close() {
    this.sock?.close();
    setShared("slack.open", false);
    pokeNotices();
  }

  // ---- Live events ----

  // Reads slack-events' lines for as long as the dialog is open, starting the
  // bridge when nothing answers.
  async listen(cx) {
    let startedAt = 0;
    for (;;) {
      try {
        this.sock = await net.connect("127.0.0.1", EVENTS_PORT);
      } catch {
        if (Date.now() - startedAt > 30_000) {
          startedAt = Date.now();
          await exec("zsh", ["-c", "exec slack-events --daemon"]).catch(() => {});
        }
        await cx.sleep(1000);
        continue;
      }
      let buffer = "";
      for (;;) {
        const bytes = await this.sock.read().catch(() => null);
        if (!bytes) break;
        // The bridge escapes everything outside ASCII, so bytes are characters.
        for (let i = 0; i < bytes.length; i += 4096) buffer += String.fromCharCode(...bytes.subarray(i, i + 4096));
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          try {
            this.event(cx, JSON.parse(line));
          } catch {}
        }
      }
      this.sock.close();
      this.sock = null;
      this.live = false;
      cx.notify();
      await cx.sleep(1000);
    }
  }

  event(cx, ev) {
    switch (ev.type) {
      case "hello":
        this.live = true;
        this.polledAt = 0;
        this.poll(cx);
        return cx.notify();
      case "bridge_disconnected":
      case "bridge_error":
        this.live = false;
        return cx.notify();
      case "message": return this.onMessage(cx, ev);
      case "reaction_added":
      case "reaction_removed": return this.touched(cx, ev.item?.channel, ev.item?.ts);
      case "channel_marked":
      case "group_marked":
      case "im_marked":
      case "mpim_marked": {
        const c = this.counts[ev.channel];
        if (!c) return;
        this.counts[ev.channel] = { ...c, lastRead: ev.ts, unread: (ev.unread_count_display ?? 0) > 0, mentions: ev.mention_count_display ?? 0 };
        return cx.notify();
      }
      case "channel_joined":
      case "channel_left":
      case "channel_rename":
      case "group_joined":
      case "group_left":
      case "im_close":
      case "mpim_close":
      case "im_created":
      case "im_open":
      case "mpim_open":
      case "mpim_joined":
        this.polledAt = 0;
        return this.poll(cx, true);
    }
  }

  // A new message goes in at once; an edit, a deletion or a reply count
  // loads the conversation again.
  onMessage(cx, ev) {
    const ch = ev.channel;
    if (ev.subtype && !["bot_message", "thread_broadcast", "file_share", "me_message"].includes(ev.subtype)) {
      return this.touched(cx, ch, ev.message?.thread_ts ?? ev.previous_message?.thread_ts);
    }
    const m = compact(ev);
    this.nameBots(cx, [m]);
    this.messageAvatar(m);
    this.fetchAvatars(cx);
    const reply = m.threadTs && m.threadTs !== m.ts;
    const add = (store, key) => {
      const e = store.get(key);
      if (e && !e.messages.some((x) => x.ts === m.ts)) store.set(key, { ...e, messages: this.settle([...e.messages, m].sort((a, b) => Number(a.ts) - Number(b.ts))) });
    };
    if (reply) add(this.threads, `${ch}:${m.threadTs}`);
    if (!reply || ev.subtype === "thread_broadcast") {
      add(this.histories, ch);
      const c = this.counts[ch] ?? { lastRead: "0", mentions: 0 };
      const seen = ch === this.current && window()?.active !== false;
      const mine = m.user === this.me?.userId;
      const mention = this.convs.get(ch)?.kind !== "channel" || m.text.includes(`<@${this.me?.userId}>`);
      this.counts[ch] = {
        ...c, latest: m.ts,
        unread: c.unread || (!seen && !mine),
        mentions: (c.mentions ?? 0) + (!seen && !mine && mention ? 1 : 0),
      };
      if (seen) this.markRead(ch);
    }
    if (reply && ch === this.current) this.want(cx, ch, true);
    if ((ch === this.current || this.thread?.channel === ch) && this.msgAt === null) this.scrollToEnd();
    if (!this.convs.has(ch)) {
      this.polledAt = 0;
      this.poll(cx, true);
    }
    cx.notify();
  }

  touched(cx, ch, threadTs) {
    if (!ch) return;
    if (ch === this.current) this.want(cx, ch, true);
    if (this.thread?.channel === ch && (!threadTs || threadTs === this.thread.ts)) this.loadThread(cx);
  }

  // ---- Slack ----

  async connect(cx) {
    this.loading = true;
    cx.notify();
    try {
      if (!session) {
        const r = await exec("zsh", ["-c", "exec slack-session"], { timeout: 20_000 });
        if (r.code !== 0) throw new Error(r.stderr.trim() || "slack-session failed");
        session = JSON.parse(r.stdout);
      }
      this.client = createSlack(session);
      await this.load(cx);
    } catch (e) {
      this.loadError = errorText(e);
      if (/refused the session/.test(this.loadError)) session = null;
    }
    this.loading = false;
    cx.notify();
  }

  // Everything the list needs, in parallel; the people only when their copy is old.
  async load(cx) {
    const wantUsers = !this.users.size || Date.now() - this.usersAt > USERS_MS;
    const [me, convs, counts, users] = await Promise.all([
      this.client.me(), this.client.conversations(), this.client.counts(), wantUsers ? this.client.users() : null,
    ]);
    this.me = me;
    this.convs = new Map(convs.map((c) => [c.id, conversation(c)]));
    this.counts = counts;
    if (users) this.setUsers(users.map(person), Date.now());
    for (const u of this.users.values()) this.avatarFor(u.avatarKey, u.avatar);
    this.fetchAvatars(cx);
    this.loadError = null;
    if (!this.current || !this.convs.has(this.current)) {
      const rows = this.rows().filter((r) => r.kind === "conv");
      const first = rows.find((r) => this.counts[r.id]?.unread) ?? rows.find((r) => this.convs.get(r.id).name === "general") ?? rows[0];
      this.current = first?.id ?? null;
    }
    this.want(cx, this.current, true);
    this.saveCache();
  }

  setUsers(list, at) {
    this.users = new Map(list.map((u) => [u.id, u]));
    this.byHandle = new Map(list.map((u) => [u.handle, u]));
    this.usersAt = at;
    this.md.clear();
  }

  // One small call says which conversations moved; only the shown one loads.
  poll(cx, lists = false) {
    if (!this.client || this.polling || window()?.active === false) return;
    if (this.live && Date.now() - this.polledAt < LIVE_POLL_MS) return;
    this.polling = true;
    this.polledAt = Date.now();
    cx.spawn(async (cx) => {
      try {
        const counts = await this.client.counts();
        const unknown = lists || Object.keys(counts).some((id) => !this.convs.has(id));
        const changed = JSON.stringify(counts) !== JSON.stringify(this.counts);
        this.counts = counts;
        if (unknown) this.convs = new Map((await this.client.conversations()).map((c) => [c.id, conversation(c)]));
        const h = this.histories.get(this.current);
        if (this.current && (!h || newer(counts[this.current]?.latest, this.newest(h.messages)) || (!this.live && Date.now() - h.at > STALE_MS))) {
          this.want(cx, this.current, true);
        } else this.markRead(this.current);
        if (this.thread && !this.live && Date.now() - (this.threads.get(this.threadKey())?.at ?? 0) > POLL_MS * 2) this.loadThread(cx);
        if (changed || unknown) cx.notify();
      } catch (e) {
        this.flash(cx, errorText(e), "error");
      }
      this.polling = false;
    });
  }

  // Loads a conversation's messages, one at a time; the latest choice wins.
  want(cx, id, force = false) {
    if (!id || !this.client) return;
    const h = this.histories.get(id);
    if (h && !force && !newer(this.counts[id]?.latest, this.newest(h.messages)) && Date.now() - h.at < STALE_MS) {
      return this.markRead(id);
    }
    this.wanted = id;
    if (this.fetching) return;
    this.fetching = true;
    cx.spawn(async (cx) => {
      while (this.wanted) {
        const id = this.wanted;
        this.wanted = null;
        try {
          const raw = await this.client.history(id);
          const old = this.histories.get(id)?.messages ?? [];
          const messages = this.settle([...raw.map(compact).reverse(), ...old.filter((m) => m.pending)]);
          const changed = JSON.stringify(messages) !== JSON.stringify(old);
          this.histories.set(id, { messages, at: Date.now() });
          this.nameBots(cx, messages);
          for (const m of messages) this.messageAvatar(m);
          this.fetchAvatars(cx);
          if (id === this.current) {
            if (changed && this.msgAt === null) this.scrollToEnd();
            this.markRead(id);
          }
        } catch (e) {
          if (id === this.current) this.flash(cx, errorText(e), "error");
        }
        cx.notify();
      }
      this.fetching = false;
      this.saveCache();
    });
  }

  loadThread(cx) {
    const t = this.thread;
    if (!t || !this.client) return;
    cx.spawn(async (cx) => {
      try {
        const raw = await this.client.replies(t.channel, t.ts);
        const key = `${t.channel}:${t.ts}`;
        const old = this.threads.get(key)?.messages ?? [];
        const messages = this.settle([...raw.map(compact), ...old.filter((m) => m.pending)]);
        this.threads.set(key, { messages, at: Date.now() });
        this.nameBots(cx, messages);
        for (const m of messages) this.messageAvatar(m);
        this.fetchAvatars(cx);
        if (JSON.stringify(messages) !== JSON.stringify(old) && this.msgAt === null) this.scrollToEnd();
      } catch (e) {
        this.flash(cx, errorText(e), "error");
      }
      cx.notify();
    });
  }

  // Bot messages carry a bot id and often no name or icon; each id is asked once.
  nameBots(cx, messages) {
    const ids = [...new Set(messages.filter((m) => (!m.name || !m.icon) && m.user?.startsWith("B") && !(m.user in this.bots)).map((m) => m.user))];
    if (!ids.length || !this.client) return;
    for (const id of ids) this.bots[id] = null;
    cx.spawn(async (cx) => {
      await Promise.all(ids.map(async (id) => {
        try {
          const b = await this.client.bot(id);
          this.bots[id] = { name: b.name, icon: b.icons?.image_72 || b.icons?.image_48 || null };
          this.avatarFor(id, this.bots[id].icon);
        } catch {}
      }));
      this.fetchAvatars(cx);
      cx.notify();
    });
  }

  // ---- Avatars ----

  avatarFor(key, url) {
    if (!key || !url || this.avatars?.has(key) || this.avatarQueue.has(key)) return;
    this.avatarQueue.set(key, url);
  }

  // Lists what's there once, then fetches what's missing with one parallel curl.
  fetchAvatars(cx) {
    if (this.downloading) return;
    this.downloading = true;
    cx.spawn(async (cx) => {
      const dir = `${appHome()}/${AVATARS}`;
      // An empty file is a download that failed; dropping it tries again.
      const list = async () => {
        const r = await exec("sh", ["-c", 'mkdir -p "$1" && find "$1" -type f -size 0 -delete && ls "$1"', "sh", dir]).catch(() => null);
        this.avatars = new Map((r?.stdout ?? "").split("\n").filter(Boolean).map((f) => [f.replace(/\.[a-z]+$/, ""), f]));
      };
      if (!this.avatars) {
        await list();
        for (const u of this.users.values()) this.avatarFor(u.avatarKey, u.avatar);
        for (const [id, b] of Object.entries(this.bots)) this.avatarFor(id, b?.icon);
        for (const h of this.histories.values()) for (const m of h.messages) this.messageAvatar(m);
        for (const key of [...this.avatarQueue.keys()]) if (this.avatars.has(key)) this.avatarQueue.delete(key);
      }
      while (this.avatarQueue.size) {
        const batch = [...this.avatarQueue].slice(0, 80);
        // Default avatars redirect through Gravatar.
        const args = ["-sSL", "--fail", "--parallel", "--max-time", "20"];
        for (const [key, url] of batch) {
          const ext = (url.match(/\.(png|jpe?g|gif|webp)(\?|$)/i)?.[1] ?? "png").toLowerCase();
          args.push("-o", `${dir}/${key}.${ext}`, url);
        }
        await exec("curl", args, { timeout: 60_000 }).catch(() => null);
        for (const [key] of batch) this.avatarQueue.delete(key);
        await list();
        cx.notify();
      }
      this.downloading = false;
      this.fetchPictures(cx);
    });
  }

  pictureFor(img) {
    if (this.pictures?.has(img.key) || this.pictureQueue.has(img.key)) return;
    this.pictureQueue.set(img.key, img.url);
  }

  // Message pictures, through slack-files: Slack's own hosts need the session
  // cookie, and Herdr's fetch can't hand back bytes.
  fetchPictures(cx) {
    if (this.fetchingPictures) return;
    this.fetchingPictures = true;
    cx.spawn(async (cx) => {
      const dir = `${appHome()}/${IMAGES}`;
      const list = async () => {
        const r = await exec("sh", ["-c", 'mkdir -p "$1" && ls "$1"', "sh", dir]).catch(() => null);
        this.pictures = new Set((r?.stdout ?? "").split("\n").filter((f) => f && !f.endsWith(".part")));
      };
      if (!this.pictures) await list();
      for (const key of [...this.pictureQueue.keys()]) if (this.pictures.has(key)) this.pictureQueue.delete(key);
      while (this.pictureQueue.size) {
        const batch = [...this.pictureQueue].slice(0, 12);
        await exec("zsh", ["-c", 'exec slack-files "$@"', "zsh", dir, ...batch.flat()], { timeout: 120_000 }).catch(() => null);
        for (const [key] of batch) this.pictureQueue.delete(key);
        await list();
        cx.notify();
      }
      this.fetchingPictures = false;
    });
  }

  // A bot message without a bot id, like a webhook's, carries its own icon.
  messageAvatar(m) {
    for (const img of m.images ?? []) this.pictureFor(img);
    const u = this.users.get(m.user);
    if (u) return this.avatarFor(u.avatarKey, u.avatar);
    if (m.icon) this.avatarFor(this.iconKey(m), m.icon);
  }

  iconKey(m) {
    return `i-${(m.icon.match(/[a-z0-9]{8,}/gi) ?? [m.user]).pop()}`;
  }

  // The picture to draw for a message's author or a DM, or null for initials.
  avatarPath(user, m = null) {
    if (!this.avatars) return null;
    const u = this.users.get(user);
    const key = u ? u.avatarKey : m?.icon ? this.iconKey(m) : this.bots[user]?.icon ? user : null;
    if (!key || !this.avatars.has(key)) return null;
    return `${AVATARS}/${this.avatars.get(key)}`;
  }

  // A sent message keeps the key it had while pending, so its row and its
  // TextView keep their state; a new TextView id draws blank until it parses.
  // Whatever brings the message first (the live event, a reload or Slack's
  // answer to the post) replaces the pending copy: Juan's earliest unmatched
  // message from Slack takes the earliest pending one.
  settle(messages) {
    const waiting = messages.filter((m) => m.pending && !m.failed);
    if (!waiting.length) return messages;
    const since = Number(waiting[0].ts) - 10; // this clock against Slack's
    const arrived = messages.filter((m) => !m.pending && m.user === this.me?.userId && Number(m.ts) >= since && !this.sentKeys.has(m.ts));
    const done = new Set();
    arrived.slice(0, waiting.length).forEach((m, i) => {
      this.sentKeys.set(m.ts, waiting[i].id);
      done.add(waiting[i].id);
    });
    return done.size ? messages.filter((m) => !done.has(m.id)) : messages;
  }

  keyOf(m) {
    return m.id ?? this.sentKeys.get(m.ts) ?? m.ts;
  }

  newest(messages) {
    for (let i = messages.length - 1; i >= 0; i--) if (!messages[i].pending) return messages[i].ts;
    return null;
  }

  // Viewing a conversation reads it, as in Slack.
  markRead(id) {
    const h = this.histories.get(id);
    const ts = h && this.newest(h.messages);
    const c = this.counts[id];
    if (!ts || !this.client || this.marked.get(id) === ts) return;
    if (c && !c.unread && !c.mentions && !newer(ts, c.lastRead)) return;
    this.marked.set(id, ts);
    if (c) this.counts[id] = { ...c, unread: false, mentions: 0, lastRead: ts };
    this.client.mark(id, ts).then(pokeNotices, () => this.marked.delete(id));
  }

  // ---- Cache ----

  async readCache() {
    const text = await readTextFile(`${home()}/${CACHE_FILE}`).catch(() => null);
    if (!text) return false;
    try {
      const c = JSON.parse(text);
      if (c.version !== CACHE_VERSION) return false;
      this.me = c.me;
      this.convs = new Map(c.convs.map((x) => [x.id, x]));
      this.setUsers(c.users, c.usersAt);
      this.bots = c.bots ?? {};
      this.counts = c.counts;
      this.histories = new Map(c.histories.map(([id, messages]) => [id, { messages, at: 0 }]));
      this.current = c.current;
      return true;
    } catch {
      return false;
    }
  }

  // Waits for a quiet moment, so a burst of loads writes once.
  saveCache() {
    if (this.saving) { this.saveAgain = true; return; }
    this.saving = true;
    const write = async () => {
      this.made ??= exec("mkdir", ["-p", `${home()}/${CACHE_DIR}`]);
      await this.made;
      const order = [this.current, ...[...this.histories.keys()].reverse()].filter((id, i, all) => id && all.indexOf(id) === i);
      const state = {
        version: CACHE_VERSION, me: this.me, current: this.current, counts: this.counts, usersAt: this.usersAt,
        convs: [...this.convs.values()], users: [...this.users.values()], bots: this.bots,
        histories: order.slice(0, CACHED_HISTORIES).map((id) => [id, (this.histories.get(id)?.messages ?? []).filter((m) => !m.pending)]),
      };
      const path = `${home()}/${CACHE_FILE}`;
      const old = await readTextFile(path).catch(() => null);
      await writeTextFile(path, JSON.stringify(state), old).catch(() => {});
    };
    write().finally(() => {
      this.saving = false;
      if (this.saveAgain) { this.saveAgain = false; this.saveCache(); }
    });
  }

  // ---- Names ----

  userName(id) {
    return this.users.get(id)?.name ?? SYSTEM[id] ?? null;
  }

  convName(c) {
    if (!c) return "";
    if (c.kind === "channel") return c.name;
    if (c.kind === "im") return this.userName(c.user) ?? c.user;
    const others = c.handles.filter((h) => h !== this.users.get(this.me?.userId)?.handle);
    return others.map((h) => this.byHandle.get(h)?.name ?? h).join(", ");
  }

  convTitle(c) {
    return c?.kind === "channel" ? `#${c.name}` : this.convName(c);
  }

  names() {
    return {
      user: (id) => this.userName(id),
      channel: (id) => this.convs.get(id)?.name ?? null,
    };
  }

  author(m) {
    return this.userName(m.user) ?? m.name ?? this.bots[m.user]?.name ?? m.user ?? "Someone";
  }

  markdown(m) {
    const key = `${m.ts}:${m.edited}:${m.text.length}`;
    let md = this.md.get(key);
    if (md === undefined) {
      md = toMarkdown(m.text, this.names());
      this.md.set(key, md);
    }
    return md;
  }

  // ---- The list ----

  // DMs Slack's sidebar shows are the ones client.counts lists.
  rows() {
    const all = [...this.convs.values()];
    const channels = all.filter((c) => c.kind === "channel").sort((a, b) => a.name.localeCompare(b.name));
    const latest = (c) => Number(this.counts[c.id]?.latest ?? 0);
    const dms = all.filter((c) => c.kind !== "channel" && (this.counts[c.id] || this.opened.has(c.id)) && this.users.get(c.user)?.deleted !== true)
      .sort((a, b) => latest(b) - latest(a));
    return [
      { kind: "section", id: "channels", title: "Channels" },
      ...channels.map((c) => ({ kind: "conv", id: c.id })),
      { kind: "section", id: "dms", title: "Direct messages" },
      ...dms.map((c) => ({ kind: "conv", id: c.id })),
    ];
  }

  // Every conversation and every person without one, matched by name.
  found() {
    const q = this.find.value().trim().toLowerCase().replace(/^[#@]/, "");
    const hit = (name, extra = "") => {
      const n = name.toLowerCase();
      if (!q) return 2;
      if (n.startsWith(q)) return 0;
      return n.includes(q) || extra.toLowerCase().includes(q) ? 1 : -1;
    };
    const out = [];
    const withIm = new Set();
    for (const c of this.convs.values()) {
      if (c.kind === "im") withIm.add(c.user);
      const name = this.convName(c);
      const score = hit(name, c.kind === "im" ? this.users.get(c.user)?.full ?? "" : "");
      if (score >= 0) out.push({ kind: "conv", id: c.id, name, score });
    }
    for (const u of this.users.values()) {
      if (u.deleted || u.bot || withIm.has(u.id) || u.id === this.me?.userId) continue;
      const score = hit(u.name, `${u.full} ${u.handle}`);
      if (score >= 0) out.push({ kind: "user", id: u.id, name: u.name, score });
    }
    const unread = (r) => (this.counts[r.id]?.unread ? 0 : 1);
    return out.sort((a, b) => a.score - b.score || unread(a) - unread(b) || a.name.localeCompare(b.name)).slice(0, 50);
  }

  open(cx, id) {
    if (!id || !this.convs.has(id)) return;
    if (id !== this.current) {
      this.current = id;
      this.thread = null;
      this.msgAt = null;
      this.scrollToEnd();
    }
    const i = this.rows().findIndex((r) => r.id === id);
    if (i >= 0) this.listScroll.scroll_to_item(i);
    this.want(cx, id);
    cx.notify();
  }

  next(cx, by) {
    const rows = this.rows();
    const at = rows.findIndex((r) => r.id === this.current);
    for (let j = at + by; j >= 0 && j < rows.length; j += by) {
      if (rows[j].kind === "conv") return this.open(cx, rows[j].id);
    }
  }

  nextUnread(cx) {
    const rows = this.rows().filter((r) => r.kind === "conv");
    const at = rows.findIndex((r) => r.id === this.current);
    for (let n = 1; n <= rows.length; n++) {
      const r = rows[(at + n) % rows.length];
      if (this.counts[r.id]?.unread || this.counts[r.id]?.mentions) return this.open(cx, r.id);
    }
    this.flash(cx, "Nothing unread");
  }

  // The search input is drawn only while finding, and focus() lands only on a
  // drawn one: draw it first, then focus it once the frame is out.
  startFind(cx) {
    this.find.set_value("");
    this.findAt = 0;
    this.finding = true;
    cx.notify();
    cx.timer.after(0, () => this.find.focus());
  }

  endFind(cx) {
    this.finding = false;
    this.find.set_value("");
    this.handle.focus();
    cx.notify();
  }

  pickFound(cx, i = this.findAt) {
    const r = this.found()[i];
    if (!r) return;
    this.endFind(cx);
    if (r.kind === "conv") {
      if (this.convs.get(r.id).kind !== "channel") this.opened.add(r.id);
      this.pane = "list";
      return this.open(cx, r.id);
    }
    this.flash(cx, `Opening a conversation with ${r.name}…`);
    cx.spawn(async (cx) => {
      try {
        const c = conversation(await this.client.openIm(r.id));
        c.user ??= r.id;
        this.convs.set(c.id, c);
        this.opened.add(c.id);
        this.note = null;
        this.open(cx, c.id);
      } catch (e) {
        this.flash(cx, errorText(e), "error");
      }
    });
  }

  // ---- Messages ----

  threadKey() {
    return this.thread ? `${this.thread.channel}:${this.thread.ts}` : null;
  }

  shown() {
    if (this.thread) return this.threads.get(this.threadKey())?.messages ?? [];
    return this.histories.get(this.current)?.messages ?? [];
  }

  selectedMessage() {
    const list = this.shown();
    return this.msgAt === null ? null : list[Math.min(this.msgAt, list.length - 1)] ?? null;
  }

  scrollToEnd() {
    // The ScrollHandle reveals a child by index; the last one ends the list.
    this.toEnd = true;
  }

  moveMessage(cx, by) {
    const list = this.shown();
    if (!list.length) return;
    const at = this.msgAt ?? list.length;
    this.msgAt = Math.max(0, Math.min(list.length - 1, at + by));
    this.msgScroll.scroll_to_item(this.msgAt);
    cx.notify();
  }

  openThread(cx, m) {
    if (!m || m.pending) return;
    if (this.thread) return this.flash(cx, "Already in the thread");
    this.thread = { channel: this.current, ts: m.threadTs ?? m.ts, parentAt: this.msgAt };
    this.msgAt = null;
    this.scrollToEnd();
    this.loadThread(cx);
    cx.notify();
  }

  closeThread(cx) {
    this.msgAt = this.thread?.parentAt ?? null;
    this.thread = null;
    if (this.msgAt !== null) this.msgScroll.scroll_to_item(this.msgAt);
    else this.scrollToEnd();
    cx.notify();
  }

  write(cx) {
    this.composing = true;
    this.composer.focus();
    cx.notify();
  }

  // Shows the message at once, sends it, and marks it failed if Slack refuses.
  send(cx) {
    const text = this.composer.value().trim();
    const channel = this.thread?.channel ?? this.current;
    if (!text || !channel || !this.client) return;
    const threadTs = this.thread?.ts ?? null;
    const key = threadTs ? `${channel}:${threadTs}` : channel;
    const store = threadTs ? this.threads : this.histories;
    const mine = {
      ...compact({ ts: `${Date.now() / 1000}`, user: this.me?.userId, text }), pending: true, id: `pending-${++pendingIds}`,
    };
    const entry = store.get(key) ?? { messages: [], at: 0 };
    store.set(key, { ...entry, messages: [...entry.messages, mine] });
    this.setComposer("");
    this.msgAt = null;
    this.scrollToEnd();
    cx.notify();
    cx.spawn(async (cx) => {
      const swap = (next) => {
        const e = store.get(key);
        if (e) store.set(key, { ...e, messages: e.messages.map((m) => (m.id === mine.id ? next : m)) });
      };
      try {
        const sent = compact(await this.client.post(channel, text, threadTs));
        if (!this.sentKeys.has(sent.ts)) this.sentKeys.set(sent.ts, mine.id);
        const e = store.get(key);
        // A poll may have brought the sent message first.
        if (e?.messages.some((m) => m.ts === sent.ts)) store.set(key, { ...e, messages: e.messages.filter((m) => m.id !== mine.id) });
        else swap(sent);
        if (!threadTs) this.counts[channel] = { ...(this.counts[channel] ?? {}), latest: sent.ts, lastRead: sent.ts, unread: false, mentions: 0 };
      } catch (e) {
        swap({ ...mine, failed: errorText(e) });
        if (!this.composer.value().trim()) this.setComposer(text);
        this.flash(cx, `Not sent: ${errorText(e)}`, "error");
      }
      cx.notify();
    });
  }

  // A DM closes as in Slack's sidebar, history kept; a channel can only be
  // left, so that takes a second d. Either goes from the list at once and
  // comes back if Slack refuses.
  closeConversation(cx) {
    const c = this.convs.get(this.current);
    if (!c || !this.client) return;
    const title = this.convTitle(c);
    if (c.kind === "channel" && this.leaving !== c.id) {
      this.leaving = c.id;
      return this.flash(cx, `Press d again to leave ${title}`);
    }
    this.leaving = null;
    const rows = this.rows().filter((r) => r.kind === "conv");
    const at = rows.findIndex((r) => r.id === c.id);
    const next = rows[at + 1] ?? rows[at - 1];
    const count = this.counts[c.id];
    const opened = this.opened.has(c.id);
    delete this.counts[c.id];
    this.opened.delete(c.id);
    if (c.kind === "channel") this.convs.delete(c.id);
    this.pane = "list";
    this.msgAt = null;
    if (next) this.open(cx, next.id);
    else { this.current = null; this.thread = null; }
    this.flash(cx, c.kind === "channel" ? `Left ${title}` : `Closed ${title}`, "success");
    cx.spawn(async (cx) => {
      try {
        await (c.kind === "channel" ? this.client.leave(c.id) : this.client.close(c.id));
        this.saveCache();
      } catch (e) {
        this.convs.set(c.id, c);
        if (count) this.counts[c.id] = count;
        if (opened) this.opened.add(c.id);
        this.flash(cx, `Couldn't ${c.kind === "channel" ? "leave" : "close"} ${title}: ${errorText(e)}`, "error");
      }
    });
  }

  link(m) {
    const channel = this.thread?.channel ?? this.current;
    if (!this.me?.url || !channel) return null;
    const base = `${this.me.url}archives/${channel}`;
    if (!m || m.pending) return base;
    const thread = m.threadTs && m.threadTs !== m.ts ? `?thread_ts=${m.threadTs}&cid=${channel}` : "";
    return `${base}/p${m.ts.replace(".", "")}${thread}`;
  }

  openInSlack(cx) {
    const m = this.pane === "messages" ? this.selectedMessage() : null;
    const channel = this.thread?.channel ?? this.current;
    const url = m ? this.link(m) : this.me && channel ? `slack://channel?team=${this.me.teamId}&id=${channel}` : null;
    if (!url) return;
    exec("open", [url]).catch(() => {});
    this.flash(cx, "Opened in Slack");
  }

  copy(cx) {
    const url = this.link(this.pane === "messages" ? this.selectedMessage() : null);
    if (!url) return;
    cx.spawn(async (cx) => {
      const r = await exec("sh", ["-c", 'printf %s "$1" | pbcopy', "sh", url]).catch((e) => ({ code: 1, stderr: errorText(e) }));
      this.flash(cx, r.code === 0 ? `Copied ${url}` : r.stderr.trim() || "pbcopy failed", r.code === 0 ? "success" : "error");
    });
  }

  // ---- Reactions ----

  mine(r) {
    return Boolean(this.me && r.users?.includes(this.me.userId));
  }

  reactingMessage() {
    return this.reacting ? this.shown().find((m) => this.keyOf(m) === this.reacting) ?? null : null;
  }

  // The message's reactions first, then the emoji the dialog draws, those
  // whose name has the search in it. A search that names none exactly is
  // offered as is, for Slack's other and custom emoji.
  reactionChoices(m) {
    const q = this.reactQuery.value().trim().toLowerCase().replace(/^:|:$/g, "");
    const names = [...new Set([...m.reactions.map((r) => r.name), ...EMOJI_NAMES])];
    if (!q) return names.slice(0, REACTION_CHOICES);
    const hits = names.filter((n) => n.includes(q));
    if (hits.includes(q) || !/^[a-z0-9_+'-]+$/.test(q)) return hits.slice(0, REACTION_CHOICES);
    return [...hits.slice(0, REACTION_CHOICES - 1), q];
  }

  // Opens on the selected message, or the last one when none is selected.
  startReact(cx) {
    const list = this.shown();
    const m = (this.pane === "messages" && this.selectedMessage()) || [...list].reverse().find((x) => !x.pending);
    if (!m) return this.flash(cx, "No message to react to");
    if (m.pending) return this.flash(cx, "That message is still on its way to Slack");
    this.reacting = this.keyOf(m);
    this.reactAt = 0;
    this.reactSearching = false;
    this.reactQuery.set_value("");
    this.handle.focus();
    cx.notify();
  }

  endReact(cx) {
    this.reacting = null;
    this.reactSearching = false;
    this.reactQuery.set_value("");
    this.handle.focus();
    cx.notify();
  }

  // The search input is drawn only while searching, and focus() lands only
  // on a drawn one: draw it first, then focus it.
  startReactSearch(cx) {
    this.reactSearching = true;
    cx.notify();
    cx.timer.after(0, () => { if (this.reactSearching) this.reactQuery.focus(); });
  }

  endReactSearch(cx) {
    this.reactSearching = false;
    this.reactQuery.set_value("");
    this.reactAt = 0;
    this.handle.focus();
    cx.notify();
  }

  pickReaction(cx, i = this.reactAt) {
    const m = this.reactingMessage();
    const name = m ? this.reactionChoices(m)[i] : null;
    this.endReact(cx);
    if (name) this.toggleReaction(cx, m, name);
  }

  // Adds the reaction, or takes it back when it's already Juan's. It shows
  // at once and goes back with an error if Slack refuses.
  toggleReaction(cx, m, name) {
    if (!this.client || !this.me || m.pending) return;
    const channel = this.thread?.channel ?? this.current;
    const [store, key] = this.thread ? [this.threads, this.threadKey()] : [this.histories, this.current];
    const me = this.me.userId;
    const on = !m.reactions.some((r) => r.name === name && this.mine(r));
    const flip = (reactions, add) => {
      const next = reactions.some((r) => r.name === name)
        ? reactions.map((r) => (r.name !== name ? r : add
          ? { ...r, count: r.count + 1, users: [...(r.users ?? []), me] }
          : { ...r, count: r.count - 1, users: (r.users ?? []).filter((u) => u !== me) }))
        : add ? [...reactions, { name, count: 1, users: [me] }] : reactions;
      return next.filter((r) => r.count > 0);
    };
    const apply = (add) => {
      const e = store.get(key);
      if (e) store.set(key, { ...e, messages: e.messages.map((x) => (x.ts === m.ts ? { ...x, reactions: flip(x.reactions, add) } : x)) });
    };
    apply(on);
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        await this.client.react(channel, m.ts, name, on);
      } catch (e) {
        apply(!on);
        this.flash(cx, `${on ? "Couldn't react" : "Couldn't take the reaction back"}: ${errorText(e)}`, "error");
      }
    });
  }

  flash(cx, text, level = "info") {
    this.note = { text, level };
    cx.notify();
  }

  reload(cx) {
    this.usersAt = 0;
    this.loadError = null;
    cx.spawn(async (cx) => {
      if (!this.client) return this.connect(cx);
      this.loading = true;
      cx.notify();
      try {
        await this.load(cx);
        if (this.thread) this.loadThread(cx);
      } catch (e) {
        this.loadError = errorText(e);
      }
      this.loading = false;
      cx.notify();
    });
  }

  // ---- Keys ----

  stepping() {
    return Boolean(this.composing || this.reacting || this.finding || this.help || this.thread || this.pane === "messages");
  }

  back(cx) {
    if (this.composing) {
      this.composing = false;
      this.handle.focus();
      return cx.notify();
    }
    if (this.reacting) return this.reactSearching ? this.endReactSearch(cx) : this.endReact(cx);
    if (this.finding) return this.endFind(cx);
    if (this.help) {
      if (!this.helpSearch.stop()) this.help = false;
      return cx.notify();
    }
    if (this.thread) return this.closeThread(cx);
    if (this.pane === "messages") {
      this.pane = "list";
      this.msgAt = null;
      return cx.notify();
    }
  }

  key(e, cx) {
    const k = keyName(e);
    if (this.composing) return;
    if (this.reacting) {
      const by = this.reactSearching
        ? { down: 1, "ctrl-n": 1, "ctrl-j": 1, up: -1, "ctrl-p": -1, "ctrl-k": -1 }[k]
        : { l: 1, right: 1, h: -1, left: -1 }[k];
      if (this.reactSearching && !by) return;
      cx.stop_propagation();
      if (k === "/" && !this.reactSearching) return this.startReactSearch(cx);
      if (k === "enter") return this.pickReaction(cx);
      if (!by) return;
      const m = this.reactingMessage();
      const n = (m && this.reactionChoices(m).length) || 1;
      this.reactAt = (this.reactAt + by + n) % n;
      return cx.notify();
    }
    if (this.finding) {
      const by = { down: 1, "ctrl-n": 1, "ctrl-j": 1, up: -1, "ctrl-p": -1, "ctrl-k": -1 }[k];
      if (!by) return;
      cx.stop_propagation();
      const n = this.found().length || 1;
      this.findAt = (this.findAt + by + n) % n;
      this.findScroll.scroll_to_item(this.findAt);
      return cx.notify();
    }
    if (this.help) {
      const act = this.helpSearch.key(k);
      if (act === "type") return;
      cx.stop_propagation();
      if (act === "search") this.helpSearch.start(cx);
      else this.help = false;
      return cx.notify();
    }
    const entry = KEYS.find((x) => x.keys.includes(k) && (!x.pane || x.pane === this.pane));
    if (!entry) return;
    cx.stop_propagation();
    this.note = null;
    if (entry.act !== "closeConv") this.leaving = null;
    switch (entry.act) {
      case "next": return this.pane === "list" ? this.next(cx, 1) : this.moveMessage(cx, 1);
      case "prev": return this.pane === "list" ? this.next(cx, -1) : this.moveMessage(cx, -1);
      case "unread": this.pane = "list"; this.msgAt = null; return this.nextUnread(cx);
      case "find": return this.startFind(cx);
      case "messages":
        this.pane = "messages";
        return this.moveMessage(cx, 0);
      case "list": return this.back(cx);
      case "write": return this.write(cx);
      case "thread": return this.openThread(cx, this.selectedMessage());
      case "reply": {
        if (!this.thread) this.openThread(cx, this.selectedMessage());
        return this.thread && this.write(cx);
      }
      case "react": return this.startReact(cx);
      case "closeConv": return this.closeConversation(cx);
      case "open": return this.openInSlack(cx);
      case "copy": return this.copy(cx);
      case "reload": return this.reload(cx);
      case "help": this.helpSearch.reset(); this.help = true; return cx.notify();
      case "close":
        if (this.stepping()) return this.back(cx);
        return closeOverlay(props().overlay);
    }
  }

  // ---- Drawing ----

  personColor(t, key) {
    const palette = [t.ansi12, t.ansi13, t.ansi14, t.ansi11, t.ansi10, t.ansi9, t.ansi4, t.ansi5, t.ansi6];
    return palette[hashOf(key) % palette.length] ?? t.accent;
  }

  avatar(t, user, name, size, m = null) {
    const radius = Math.round(size * 0.3);
    const path = this.avatarPath(user, m);
    if (path) return image(path).flex_none().size(size).rounded(radius).overflow_hidden();
    const color = this.personColor(t, user ?? name);
    return div().flex_none().size(size).rounded(radius).bg(alpha(color, "2e")).text_color(color)
      .text_size(Math.max(9, Math.round(size * 0.4))).font_semibold().flex().items_center().justify_center()
      .child(initials(name));
  }

  convIcon(t, c, size, on = false) {
    if (c.kind === "im") return this.avatar(t, c.user, this.convName(c), size);
    const radius = Math.round(size * 0.3);
    const box = div().flex_none().size(size).rounded(radius).flex().items_center().justify_center()
      .text_size(Math.round(size * 0.5)).font_semibold();
    if (c.kind === "mpim") {
      const color = this.personColor(t, c.id);
      return box.bg(alpha(color, "2e")).text_color(color).text_size(Math.round(size * 0.42)).child(String(c.handles.length - 1));
    }
    return box.bg(on ? alpha(t.accent, "33") : t.raised).text_color(on ? t.accent : c.private ? t.ansi3 : t.muted).child(c.private ? "∗" : "#");
  }

  keyChip(t, k) {
    return div().flex_none().px(6).h(18).rounded(5).bg(t.raised).border_1().border_color(t.border).text_color(t.foreground).text_size(10.5).flex().items_center().child(KEY_LABEL[k] ?? k);
  }

  pill(t, text, color, bg = alpha(color, "24")) {
    return h_flex().flex_none().gap(5).px(8).h(20).rounded(10).items_center().bg(bg).text_size(11).text_color(color).child(text);
  }

  centered(t, pane, title, note, color = t.foreground) {
    return pane.items_center().justify_center().gap(6)
      .child(div().text_size(18).font_semibold().text_color(color).child(title))
      .when(!!note, (el) => el.child(div().max_w(560).text_size(12).text_color(t.dim).child(note)));
  }

  convRow(t, id, on) {
    const c = this.convs.get(id);
    const n = this.counts[id];
    const unread = Boolean(n?.unread || n?.mentions);
    return h_flex().h(ROW.conv).py(1).child(h_flex().id(`row-${id}`).size_full().px(8).gap(10).rounded(8).items_center()
      .when(on, (el) => el.bg(alpha(t.accent, this.pane === "list" ? "2e" : "1a")))
      .when(!on, (el) => el.hover((s) => s.bg(t.hover)))
      .child(this.convIcon(t, c, 22, on))
      .child(div().flex_1().min_w(0).truncate()
        .text_color(on || unread ? t.foreground : t.muted)
        .when(unread, (el) => el.font_semibold())
        .child(this.convName(c)))
      .when(n?.mentions > 0, (el) => el.child(div().flex_none().px(6).min_w(18).h(18).rounded(9).bg(t.accent)
        .text_color(t.accent_foreground).text_size(10.5).font_bold().flex().items_center().justify_center().child(String(n.mentions))))
      .when(unread && !n?.mentions, (el) => el.child(div().flex_none().size(7).rounded_full().bg(t.accent))));
  }

  renderList(t) {
    const rows = this.rows();
    const unread = rows.filter((r) => r.kind === "conv" && (this.counts[r.id]?.unread || this.counts[r.id]?.mentions)).length;
    const team = this.me?.team ?? "Slack";
    const card = v_flex().w(272).flex_none().h_full().rounded(12).bg(t.surface).border_1().border_color(t.border).overflow_hidden();
    const head = h_flex().flex_none().px(14).h(56).gap(10).items_center().border_b_1().border_color(t.border)
      .child(div().flex_none().size(30).rounded(9).bg(t.accent).text_color(t.accent_foreground).font_bold().text_size(14)
        .flex().items_center().justify_center().child(initials(team).slice(0, 1)))
      .child(v_flex().flex_1().min_w(0)
        .child(div().truncate().font_semibold().text_color(t.foreground).child(team))
        .child(div().text_size(11).text_color(t.dim).child(unread ? `${unread} unread` : "All read")))
      .when(!!this.client, (el) => el.child(this.live
        ? this.pill(t, "live", t.ansi2).child(div().size(6).rounded_full().bg(t.ansi2))
        : this.pill(t, this.loading ? "loading" : "polling", t.dim, t.raised)));
    if (rows.length <= 2) return card.child(head).child(div().flex_1().flex().items_center().justify_center().text_color(t.dim).child("No conversations"));
    const draw = (r) => r.kind === "section"
      ? h_flex().h(ROW.section).px(10).pt(12).items_center().child(div().text_size(10.5).font_semibold().text_color(t.dim).child(r.title.toUpperCase()))
      : this.convRow(t, r.id, r.id === this.current);
    return card.child(head).child(div().flex_1().min_h(0).relative().px(6).pb(6)
      .child(v_virtual_list("convs", rows.length, rows.map((r) => ROW[r.kind]), (i) => `${rows[i].kind}:${rows[i].id}`,
        (range) => rows.slice(range.start, range.end).map(draw))
        .track_scroll(this.listScroll).size_full()
        .on_item_click((key, cx) => {
          if (!key.startsWith("conv:")) return;
          if (this.finding) this.endFind(cx);
          this.pane = "list";
          this.handle.focus();
          this.open(cx, key.slice(5));
        }))
      .child(Scrollbar.vertical("convs").absolute().inset_0()));
  }

  renderFind(t) {
    const found = this.found();
    const at = Math.min(this.findAt, found.length - 1);
    return v_flex().flex_1().min_h(0).gap(12).p(18)
      .child(h_flex().h(40).flex_none().px(12).gap(10).rounded(10).border_1().border_color(t.accent).bg(t.surface).items_center()
        .child(div().text_color(t.accent).child("⌕"))
        .child(Input.new(this.find).flex_1().h_full().text_size(13.5).text_color(t.foreground)))
      .child(v_flex().id("found").flex_1().min_h(0).gap(2).overflow_y_scrollbar().track_scroll(this.findScroll)
        .children(found.map((r, i) => {
          const c = r.kind === "conv" ? this.convs.get(r.id) : null;
          const n = this.counts[r.id];
          const note = r.kind === "user" ? "new message" : c.kind === "channel" ? (c.private ? "private channel" : "channel")
            : c.kind === "mpim" ? "group" : "direct message";
          return h_flex().id(`f-${r.id}`).flex_none().gap(10).px(10).h(40).rounded(8).items_center()
            .when(i === at, (el) => el.bg(alpha(t.accent, "2e")))
            .when(i !== at, (el) => el.hover((s) => s.bg(t.hover)))
            .on_click((_e, cx) => this.pickFound(cx, i))
            .child(c ? this.convIcon(t, c, 24) : this.avatar(t, r.id, r.name, 24))
            .child(div().flex_1().min_w(0).truncate().text_color(n?.unread || i === at ? t.foreground : t.muted)
              .when(Boolean(n?.unread), (el) => el.font_semibold()).child(r.name))
            .child(div().flex_none().text_size(11).text_color(t.dim).child(note));
        })))
      .child(div().flex_none().text_size(11.5).text_color(t.dim).child("↑↓ choose · ↵ open · Esc back"));
  }

  // Messages of one author within a few minutes share a card; each message
  // is still its own child, so the ScrollHandle can reveal it by index.
  startsGroup(m, prev) {
    return !prev || prev.user !== m.user || dayKey(tsDate(prev.ts)) !== dayKey(tsDate(m.ts))
      || Number(m.ts) - Number(prev.ts) > GROUP_GAP || Boolean(prev.subtype) !== Boolean(m.subtype) || (this.thread && prev === this.shown()[0]);
  }

  divider(t, text) {
    return h_flex().pt(18).pb(8).gap(12).items_center()
      .child(div().flex_1().h(1).bg(t.border))
      .child(div().flex_none().px(10).h(22).rounded(11).bg(t.surface).border_1().border_color(t.border)
        .text_size(11).font_semibold().text_color(t.muted).flex().items_center().child(text))
      .child(div().flex_1().h(1).bg(t.border));
  }

  messageEl(t, m, prev, next, i, at) {
    const d = tsDate(m.ts);
    const newDay = !prev || dayKey(tsDate(prev.ts)) !== dayKey(d);
    const head = this.startsGroup(m, prev);
    const last = !next || this.startsGroup(next, m);
    const on = i === at;
    const md = this.markdown(m);
    const meta = m.subtype && !["bot_message", "thread_broadcast", "file_share", "me_message"].includes(m.subtype);
    const bot = m.user?.startsWith("B") || this.users.get(m.user)?.bot;
    const name = this.author(m);
    const repliesDivider = this.thread && i === 1;
    return v_flex().id(`m-${this.keyOf(m)}`).flex_none()
      .on_click((_e, cx) => { this.pane = "messages"; this.msgAt = i; this.handle.focus(); cx.notify(); })
      .when(newDay && !repliesDivider, (el) => el.child(this.divider(t, dayLabel(d))))
      .when(repliesDivider, (el) => el.child(this.divider(t, `${this.shown().length - 1} ${this.shown().length === 2 ? "reply" : "replies"}`)))
      .when(head && !newDay && !repliesDivider, (el) => el.pt(10))
      .child(h_flex().items_start().gap(12).px(12)
        .pt(head ? 12 : 3).pb(last ? 12 : 3)
        .when(head, (el) => el.rounded_t(12))
        .when(last, (el) => el.rounded_b(12))
        .bg(on ? alpha(t.accent, "26") : t.surface)
        .border_l_2().border_color(on ? t.accent : t.surface)
        .child(head ? this.avatar(t, m.user, name, 36, m) : div().flex_none().w(36))
        .child(v_flex().flex_1().min_w(0).gap(4)
          .when(head, (el) => el.child(h_flex().gap(8).items_center()
            .child(div().font_semibold().text_color(m.pending ? t.muted : this.personColor(t, m.user ?? name)).child(name))
            .when(bot, (el) => el.child(div().px(4).h(15).rounded(3).bg(t.raised).text_size(9.5).font_bold().text_color(t.dim).flex().items_center().child("APP")))
            .child(div().text_size(11).text_color(t.dim).child(clock(d)))
            .when(Boolean(m.edited), (el) => el.child(div().text_size(11).text_color(t.dim).child("(edited)")))
            .when(Boolean(m.failed), (el) => el.child(div().text_size(11).text_color(t.ansi1).child(`not sent: ${m.failed}`)))))
          .when(!!md, (el) => el.child(meta
            ? div().text_size(12.5).italic().text_color(t.dim).child(plain(m.text, this.names()))
            : div().text_color(m.pending ? t.muted : t.foreground).child(TextView.markdown(`md-${this.keyOf(m)}-${m.edited}`, md))))
          .children(m.attachments.map((a, j) => div().pl(10).py(4).border_l_2().border_color(alpha(t.accent, "66")).text_size(12.5).text_color(t.muted)
            .child(TextView.markdown(`at-${m.ts}-${j}`, toMarkdown(a, this.names())))))
          .children((m.images ?? []).map((img, j) => {
            const size = fit(img);
            const ready = this.pictures?.has(img.key);
            return div().id(`img-${m.ts}-${j}`).flex_none().w(size.w).h(size.h).rounded(10).overflow_hidden()
              .bg(t.background).border_1().border_color(t.border).cursor_pointer()
              .on_click((_e, cx) => { exec("open", [img.link]).catch(() => {}); cx.stop_propagation(); })
              .child(ready ? image(`${IMAGES}/${img.key}`).size_full()
                : div().size_full().flex().items_center().justify_center().text_size(11.5).text_color(t.dim).child("loading image…"));
          }))
          .when(m.files.length > 0, (el) => el.child(h_flex().gap(6).flex_wrap().children(m.files.map((f) =>
            h_flex().flex_none().gap(6).px(10).h(28).rounded(8).items_center().bg(t.background).border_1().border_color(t.border)
              .child(div().text_color(t.accent).child("▤")).child(div().max_w(320).truncate().text_size(12).text_color(t.foreground).child(f))))))
          .when(m.reactions.length > 0, (el) => el.child(h_flex().gap(5).flex_wrap().pt(2).children(m.reactions.map((r) => {
            const mine = this.mine(r);
            return h_flex().id(`re-${this.keyOf(m)}-${r.name}`).flex_none().gap(5).px(7).h(24).rounded(12).items_center().text_size(12).cursor_pointer()
              .bg(mine ? alpha(t.accent, "26") : t.background).border_1().border_color(mine ? t.accent : t.border).hover((s) => s.border_color(t.accent))
              .on_click((_e, cx) => { this.toggleReaction(cx, m, r.name); cx.stop_propagation(); })
              .child(emoji(r.name)).child(div().text_size(11).font_semibold().text_color(mine ? t.accent : t.muted).child(String(r.count)));
          }))))
          .when(this.reacting === this.keyOf(m), (el) => el.child(this.renderReactionPicker(t, m)))
          .when(!this.thread && m.replies > 0, (el) => el.child(h_flex().id(`th-${m.ts}`).mt(2).gap(8).px(8).h(30).rounded(8).items_center()
            .bg(t.background).border_1().border_color(t.border).hover((s) => s.border_color(t.accent))
            .on_click((_e, cx) => { this.pane = "messages"; this.msgAt = i; this.openThread(cx, m); cx.stop_propagation(); })
            .child(h_flex().gap(2).children(m.replyUsers.map((u) => this.avatar(t, u, this.userName(u) ?? "?", 18))))
            .child(div().text_size(12).font_semibold().text_color(t.accent).child(`${m.replies} ${m.replies === 1 ? "reply" : "replies"}`))
            .when(Boolean(m.lastReply), (el) => el.child(div().text_size(11.5).text_color(t.dim).child(`last ${ago(m.lastReply)}`)))))));
  }

  renderReactionPicker(t, m) {
    const choices = this.reactionChoices(m);
    const at = Math.min(this.reactAt, choices.length - 1);
    return v_flex().id("react-picker").mt(4).gap(8).p(8).rounded(10).bg(t.background).border_1().border_color(t.accent)
      .on_click((_e, cx) => cx.stop_propagation())
      .when(this.reactSearching, (el) => el.child(h_flex().h(28).px(8).rounded(6).border_1().border_color(t.border).items_center()
        .child(Input.new(this.reactQuery).flex_1().h_full().text_size(12.5).text_color(t.foreground))))
      .child(h_flex().gap(5).flex_wrap().children(choices.map((name, i) => {
        const char = emoji(name);
        const mine = m.reactions.some((r) => r.name === name && this.mine(r));
        const drawn = char !== `:${name}:`;
        return h_flex().id(`pick-${name}`).flex_none().min_w(34).h(30).px(drawn ? 0 : 8).rounded(8).items_center().justify_center().cursor_pointer()
          .bg(i === at ? alpha(t.accent, "40") : t.surface).border_1().border_color(i === at || mine ? t.accent : t.border)
          .on_click((_e, cx) => { this.pickReaction(cx, i); cx.stop_propagation(); })
          .child(drawn ? div().text_size(16).child(char) : div().text_size(11.5).text_color(t.muted).child(char));
      })));
  }

  renderMessages(t) {
    const list = this.shown();
    const loaded = this.thread ? this.threads.has(this.threadKey()) : this.histories.has(this.current);
    const body = v_flex().relative().flex_1().min_h(0);
    if (!list.length) return body.items_center().justify_center().child(div().text_color(t.dim).child(loaded ? "No messages yet" : "Loading…"));
    const at = this.pane === "messages" && this.msgAt !== null ? Math.min(this.msgAt, list.length - 1) : -1;
    if (this.toEnd) {
      this.toEnd = false;
      this.msgScroll.scroll_to_item(list.length - 1);
    }
    // The picker grows its message as it searches and filters; keep it shown.
    const reactingAt = this.reacting ? list.findIndex((m) => this.keyOf(m) === this.reacting) : -1;
    if (reactingAt >= 0) this.msgScroll.scroll_to_item(reactingAt);
    const id = `msgs-${this.threadKey() ?? this.current}`;
    return body
      .child(v_flex().id(id).absolute().inset_0().overflow_y_scroll().track_scroll(this.msgScroll).px(16).pb(12)
        .children(list.map((m, i) => this.messageEl(t, m, list[i - 1], list[i + 1], i, at))))
      .child(Scrollbar.vertical(id).absolute().inset_0());
  }

  renderHelp(t) {
    const label = (k) => `${k.label}${k.pane ? ` (${k.pane === "list" ? "conversations" : "messages"})` : ""}`;
    const keys = this.helpSearch.filter(KEYS, label);
    const groups = [...new Set(keys.map((k) => k.group))];
    const box = this.helpSearch.box(t, keys.length);
    return v_flex().id("help").flex_1().min_h(0).gap(16).p(22).overflow_y_scrollbar()
      .child(div().text_size(16).font_semibold().text_color(t.foreground).child("Keys"))
      .when(!!box, (el) => el.child(box))
      .child(h_flex().gap(14).items_start().flex_wrap().children(groups.map((g) => v_flex().gap(6).min_w(260).p(14).rounded(12).bg(t.surface).border_1().border_color(t.border)
        .child(div().text_size(10.5).font_semibold().text_color(t.accent).child(g.toUpperCase()))
        .children(keys.filter((k) => k.group === g).map((k) => h_flex().gap(8).items_center()
          .child(h_flex().gap(3).w(70).flex_none().children(k.keys.map((x) => this.keyChip(t, x))))
          .child(div().text_size(12).text_color(t.muted).child(label(k))))))))
      .child(div().text_size(11.5).text_color(t.dim).child("In the composer ↵ sends, ⇧↵ adds a line and Esc leaves it. Opening a conversation marks it read. / searches the keys; any other key closes this."));
  }

  convSubtitle(c) {
    if (c.kind === "channel") return c.topic ? plain(c.topic, this.names()) : c.private ? "Private channel" : "Channel";
    if (c.kind === "im") return this.users.get(c.user)?.full || "Direct message";
    return "Group message";
  }

  renderConversation(t) {
    const pane = v_flex().flex_1().min_w(0).h_full().rounded(12).bg(t.chrome).border_1().border_color(t.border).overflow_hidden();
    if (this.help) return pane.child(this.renderHelp(t));
    if (this.finding) return pane.child(this.renderFind(t));
    const c = this.convs.get(this.current);
    if (!c) return this.centered(t, pane, this.loading ? "Loading…" : "Nothing open", null, t.dim);
    const target = this.thread ? "in thread" : `to ${this.convTitle(c)}`;
    const hasText = Boolean(this.composer.value().trim());
    const head = h_flex().flex_none().px(18).h(56).gap(12).items_center().border_b_1().border_color(t.border).bg(t.surface)
      .when(!!this.thread, (el) => el.child(h_flex().id("thread-back").flex_none().px(8).h(26).gap(4).rounded(7).items_center()
        .bg(t.raised).hover((s) => s.bg(t.hover)).text_color(t.muted).text_size(12)
        .on_click((_e, cx) => this.closeThread(cx)).child("‹ back")))
      .child(this.convIcon(t, c, 30, true))
      .child(v_flex().flex_1().min_w(0)
        .child(div().truncate().text_size(15).font_semibold().text_color(t.foreground).child(this.thread ? "Thread" : this.convTitle(c)))
        .child(div().truncate().text_size(11.5).text_color(t.dim).child(this.thread ? `in ${this.convTitle(c)}` : this.convSubtitle(c))));
    return pane
      .child(head)
      .child(this.renderMessages(t))
      // The textarea is always drawn: focus() only lands on a drawn one, and
      // a focus that lands nowhere leaves every key, Esc too, with no taker.
      .child(div().flex_none().px(16).pb(16).pt(4)
        .child(h_flex().gap(10).pl(14).pr(8).py(8).items_end().rounded(12).border_1()
          .border_color(this.composing ? t.accent : t.border).bg(t.surface)
          .when(this.composing, (el) => el.shadow_sm())
          .child(div().flex_1().min_w(0).py(4).child(Textarea.new(this.composer).w_full().text_size(13).text_color(t.foreground)))
          .child(h_flex().flex_none().gap(8).items_center().h(30)
            .child(div().text_size(11.5).text_color(t.dim).child(target))
            .child(div().id("send").size(30).rounded(8).flex().items_center().justify_center().text_size(14).font_bold()
              .bg(hasText ? t.accent : t.raised).text_color(hasText ? t.accent_foreground : t.dim)
              .when(hasText, (el) => el.cursor_pointer())
              .on_click((_e, cx) => this.send(cx))
              .child("↑")))));
  }

  renderMain(t) {
    if (!this.convs.size) {
      const pane = v_flex().flex_1().min_h(0).rounded(12).bg(t.background).border_1().border_color(t.border);
      if (this.loadError) return this.centered(t, pane, "Couldn't load Slack", `${this.loadError} · ⌃R retries`, t.ansi1);
      return this.centered(t, pane, "Loading…");
    }
    return h_flex().flex_1().min_h(0).gap(12).child(this.renderList(t)).child(this.renderConversation(t));
  }

  renderFooter(t) {
    const status = this.note
      ? { text: this.note.text, color: { error: t.ansi1, success: t.ansi2 }[this.note.level] ?? t.muted }
      : this.loadError && this.convs.size ? { text: this.loadError, color: t.ansi1 } : null;
    const keys = this.composing ? [["enter", "send"], ["⇧↵", "new line"], ["escape", "leave"]]
      : this.reacting && this.reactSearching ? [["↑↓", "choose"], ["enter", "react, or take yours back"], ["escape", "clear search"]]
      : this.reacting ? [["h/l", "choose"], ["enter", "react, or take yours back"], ["/", "search emoji"], ["escape", "back"]]
      : this.finding ? [["↑↓", "choose"], ["enter", "open"], ["escape", "back"]]
      : KEYS.filter((k) => k.footer && (!k.pane || k.pane === this.pane)).map((k) => [k.keys[0], k.label]);
    return h_flex().flex_none().w_full().px(4).gap(12).items_center()
      .child(h_flex().flex_1().min_w(0).flex_wrap().gap_x(14).gap_y(4).items_center()
        .children(keys.map(([key, label]) => h_flex().gap(6).items_center().child(this.keyChip(t, key)).child(div().text_size(11.5).text_color(t.muted).child(label)))))
      .when(!!status, (el) => el.child(div().flex_none().max_w(520).truncate().text_size(11.5).text_color(status.color).child(status.text)));
  }

  render() {
    const t = theme();
    return v_flex()
      .id("slack")
      .track_focus(this.handle)
      .when(this.stepping(), (el) => el.on_action("overlay.close", (_e, cx) => {
        this.back(cx);
        cx.stop_propagation();
      }))
      .key_context("SlackDialog")
      .on_key_down((e, cx) => this.key(e, cx))
      .size_full()
      .p(14)
      .gap(10)
      .bg(t.popover)
      .text_size(13)
      .child(this.renderMain(t))
      .child(this.renderFooter(t));
  }
}
