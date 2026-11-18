// Everything the mail mod asks of Gmail, through gog on the definition
// machine. gog finds its account and keyring only through GOG_* variables that
// ~/.zshenv exports, so it runs under zsh, which reads .zshenv.

import { exec, readTextFile, writeTextFile } from "herdr";

async function gog(args) {
  const r = await exec("zsh", ["-c", 'exec gog "$@"', "zsh", ...args, "--json"]);
  if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim().split("\n").slice(-3).join("\n") || `gog ${args.slice(0, 2).join(" ")} failed`);
  return JSON.parse(r.stdout);
}

// The 50 newest threads in the inbox, as the list shows them.
export async function listInbox() {
  const all = await gog(["gmail", "search", "in:inbox", "--max", "50", "--results-only"]);
  return (all ?? []).map((th) => ({
    id: th.id, from: th.from, subject: th.subject, date: th.internalDateIso || th.date,
    unread: th.labels?.includes("UNREAD") ?? false, count: th.messageCount ?? 1, labels: th.labels ?? [],
  }));
}

// Decoded on the definition machine by `dev herdr mail-thread`: decoding a
// large HTML email takes longer than a mod's time limit for one call.
export async function getThread(id) {
  const r = await exec("zsh", ["-c", 'exec dev herdr mail-thread "$1"', "zsh", id]);
  if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim().split("\n").slice(-3).join("\n") || "dev herdr mail-thread failed");
  return JSON.parse(r.stdout);
}

export const webUrl = async (id) => (await gog(["gmail", "url", id])).urls[0].url;

// Adds and removes labels on a whole thread, by name or id. Archiving removes
// INBOX; trashing adds TRASH, as gog's own trash command does per message.
export function modify(id, { add = [], remove = [] }) {
  const args = ["gmail", "thread", "modify", id];
  for (const l of add) args.push("--add-label", l);
  for (const l of remove) args.push("--remove-label", l);
  return gog(args);
}

export async function userLabels() {
  const r = await gog(["gmail", "labels", "list"]);
  return (r.labels ?? r).filter((l) => l.type === "user").map((l) => l.name).sort((a, b) => a.localeCompare(b));
}

// Decoded threads, kept in ~/.cache/herdr-mail on the definition machine, in
// desktop's format. A thread is stale when its key (message count and last
// date) changes.
const CACHE_VERSION = 3;
export const keyOf = (th) => `${CACHE_VERSION}|${th.count}|${th.date}`;

let dir = null;
const cacheDir = () => {
  dir ??= exec("sh", ["-c", 'mkdir -p "$HOME/.cache/herdr-mail" && cd "$HOME/.cache/herdr-mail" && pwd -P']).then((r) => {
    if (r.code !== 0) throw new Error(r.stderr.trim() || "no cache folder");
    return r.stdout.trim();
  });
  return dir;
};

export async function cachedThread(id, key) {
  const text = await readTextFile(`${await cacheDir()}/${id}.json`).catch(() => null);
  if (!text) return null;
  try {
    const entry = JSON.parse(text);
    return entry.key === key ? entry.thread : null;
  } catch (_) {
    return null;
  }
}

export async function saveThread(id, key, thread) {
  await writeTextFile(`${await cacheDir()}/${id}.json`, JSON.stringify({ key, thread })).catch(() => {});
}
