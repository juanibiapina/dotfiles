// The dialog's cache in ~/.cache/herdr-slack/state.json, with Slack's
// messages and conversations cut to what the dialog draws and keeps there.
// scripts/link-dotfiles.bash copies this file and slack.js into the notices
// mod, which counts what needs Juan and refreshes the cache while the dialog
// is closed. This file imports nothing from "herdr", so node can load it.

import { countsById } from "./slack.js";

export const CACHE_DIR = ".cache/herdr-slack";
export const CACHE_FILE = `${CACHE_DIR}/state.json`;
export const CACHE_VERSION = 3;
export const CACHED_HISTORIES = 12;
// Histories one refresh loads at most; the rest wait for the next one.
const REFRESH_LIMIT = 4;

export const newer = (a, b) => Number(a ?? 0) > Number(b ?? 0);

export function hashOf(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

// Every picture a message shows: uploaded images (a GIF whole, so it moves;
// others as Slack's 720 px thumbnail), link previews and image blocks, like
// Giphy's. `key` names the downloaded file.
function images(m) {
  const out = [];
  const add = (key, url, w, h, link, ext) => {
    if (!url || out.some((x) => x.url === url)) return;
    ext ??= (url.match(/\.(gif|png|jpe?g|webp)(\?|$)/i)?.[1] ?? "png").toLowerCase().replace("jpeg", "jpg");
    out.push({ key: `${key}.${ext}`, url, w: Number(w) || 0, h: Number(h) || 0, link: link || url });
  };
  for (const f of m.files ?? []) {
    if (!f.mimetype?.startsWith("image/")) continue;
    const ext = f.mimetype.split("/")[1].replace("jpeg", "jpg").replace("svg+xml", "svg");
    if (ext === "gif") add(`f-${f.id}`, f.url_private, f.original_w, f.original_h, f.permalink, ext);
    else if (f.thumb_720) add(`f-${f.id}-720`, f.thumb_720, f.thumb_720_w, f.thumb_720_h, f.permalink, ext);
    else add(`f-${f.id}`, f.thumb_480 ?? f.thumb_360 ?? f.url_private, f.thumb_480_w ?? f.thumb_360_w ?? f.original_w, f.thumb_480_h ?? f.thumb_360_h ?? f.original_h, f.permalink, ext);
  }
  for (const a of m.attachments ?? []) {
    if (a.image_url) add(`u-${hashOf(a.image_url)}`, a.image_url, a.image_width, a.image_height, a.title_link || a.original_url);
    else if (a.thumb_url) add(`u-${hashOf(a.thumb_url)}`, a.thumb_url, a.thumb_width, a.thumb_height, a.title_link || a.original_url);
  }
  for (const b of m.blocks ?? []) {
    if (b.type === "image") add(`u-${hashOf(b.image_url)}`, b.image_url, b.image_width, b.image_height, b.image_url);
  }
  return out;
}

// Slack's message, cut to what the dialog draws and caches.
export function compact(m) {
  const attachments = (m.attachments ?? [])
    .map((a) => [a.pretext, a.title, a.text || (a.title ? null : a.fallback)].filter(Boolean).join("\n"))
    .filter(Boolean);
  return {
    ts: m.ts,
    user: m.user ?? m.bot_id ?? null,
    name: m.user_profile?.display_name || m.user_profile?.real_name || m.username || m.bot_profile?.name || null,
    icon: m.bot_profile?.icons?.image_72 || m.icons?.image_72 || m.icons?.image_48 || null,
    replyUsers: (m.reply_users ?? []).slice(0, 3),
    lastReply: m.latest_reply ?? null,
    text: m.text ?? "",
    subtype: m.subtype ?? null,
    threadTs: m.thread_ts ?? null,
    replies: m.reply_count ?? 0,
    reactions: (m.reactions ?? []).map((r) => ({ name: r.name, count: r.count })),
    files: (m.files ?? []).filter((f) => !f.mimetype?.startsWith("image/")).map((f) => f.title || f.name || "file"),
    images: images(m),
    attachments,
    edited: m.edited?.ts ?? null,
  };
}

// Conversations as the list needs them; the name of a DM comes from users later.
export function conversation(c) {
  const kind = c.is_im ? "im" : c.is_mpim ? "mpim" : "channel";
  return {
    id: c.id, kind, name: c.name ?? null, user: c.user ?? null, private: Boolean(c.is_private),
    topic: c.topic?.value || c.purpose?.value || "",
    // mpdm-ana--bob--juan-1 names its members by handle.
    handles: kind === "mpim" ? (c.name ?? "").replace(/^mpdm-/, "").replace(/-\d+$/, "").split("--") : null,
  };
}

// What the notices corner counts: direct and group messages with unread
// messages, channels that mention Juan, and thread mentions.
export function needsYou(raw) {
  let n = raw.threads?.mention_count ?? 0;
  for (const x of raw.channels ?? []) if (x.mention_count > 0) n++;
  for (const x of [...(raw.ims ?? []), ...(raw.mpims ?? [])]) if (x.has_unreads || x.mention_count > 0) n++;
  return n;
}

const lastTs = (messages) => messages?.at(-1)?.ts;

// Brings the cache up to date with client.counts (raw): the counts, and the
// last messages of each conversation that moved, when the cache keeps it or it
// needs Juan. `synced` remembers the latest ts each conversation was loaded
// at, so one whose newest message is a thread reply, which history doesn't
// list, loads once. read() and write(text, expected) are the cache file;
// write refuses when the file is no longer `expected`, as when the dialog
// saved in between. Resolves to true when nothing is left to load.
export async function refreshCache({ client, raw, read, write, synced }) {
  const text = await read().catch(() => null);
  if (!text) return true;
  let cache;
  try {
    cache = JSON.parse(text);
  } catch {
    return true;
  }
  if (cache.version !== CACHE_VERSION) return true;
  const counts = countsById(raw);
  const histories = new Map(cache.histories);
  const dms = new Set([...(raw.ims ?? []), ...(raw.mpims ?? [])].map((x) => x.id));
  const wanted = (id, c) => histories.has(id) || c.mentions > 0 || (dms.has(id) && c.unread);
  const stale = Object.entries(counts)
    .filter(([id, c]) => wanted(id, c) && c.latest !== synced.get(id) && newer(c.latest, lastTs(histories.get(id))))
    .sort(([, a], [, b]) => Number(b.latest) - Number(a.latest));
  const loaded = [];
  for (const [id, c] of stale.slice(0, REFRESH_LIMIT)) {
    histories.set(id, (await client.history(id)).map(compact).reverse());
    loaded.push([id, c.latest]);
  }
  if (!loaded.length && JSON.stringify(counts) === JSON.stringify(cache.counts)) return true;
  const known = new Set(cache.convs.map((c) => c.id));
  if (loaded.some(([id]) => !known.has(id))) cache.convs = (await client.conversations()).map(conversation);
  const order = [cache.current, ...loaded.map(([id]) => id), ...histories.keys()]
    .filter((id, i, all) => id && histories.has(id) && all.indexOf(id) === i);
  cache.counts = counts;
  cache.histories = order.slice(0, CACHED_HISTORIES).map((id) => [id, histories.get(id)]);
  await write(JSON.stringify(cache), text);
  for (const [id, latest] of loaded) synced.set(id, latest);
  return stale.length <= REFRESH_LIMIT;
}
