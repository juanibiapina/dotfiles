// Everything the mail mod asks of Gmail, through gog on this Mac. gog finds its
// account and keyring only through GOG_* variables that ~/.zshenv exports and
// Herdr's exec doesn't pass, so it runs under zsh, which reads .zshenv.

import { exec, home, readTextFile, writeTextFile } from "herdr";
import { readThread } from "./message.js";

async function gog(args) {
  const r = await exec("zsh", ["-c", 'exec gog "$@"', "zsh", ...args, "--json"], { timeout: 60_000 });
  if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim().split("\n").slice(-3).join("\n") || `gog ${args.slice(0, 2).join(" ")} failed`);
  return JSON.parse(r.stdout);
}

export const listInbox = () => gog(["gmail", "search", "in:inbox", "--max", "50", "--results-only"]);

export const getThread = async (id) => readThread(await gog(["gmail", "thread", "get", id]));

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

// Decoded threads, kept on disk so the dialog shows them at once when it opens
// again. A thread is stale when its key (message count and last date) changes.
const cacheDir = () => `${home()}/.cache/herdr-mail`;
let made = null;

export async function cachedThread(id, key) {
  const text = await readTextFile(`${cacheDir()}/${id}.json`).catch(() => null);
  if (!text) return null;
  try {
    const entry = JSON.parse(text);
    return entry.key === key ? entry.thread : null;
  } catch {
    return null;
  }
}

export async function saveThread(id, key, thread) {
  made ??= exec("mkdir", ["-p", cacheDir()]);
  await made;
  const path = `${cacheDir()}/${id}.json`;
  const old = await readTextFile(path).catch(() => null);
  await writeTextFile(path, JSON.stringify({ key, thread }), old).catch(() => {});
}
