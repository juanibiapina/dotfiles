// The sources the corner counts. Each check resolves to { count, more, memo,
// interval } or { unchanged: true }, and throws when the source can't answer.
// exec and the rest come from Herdr: this file imports nothing from "herdr" so
// node --test can load it. slack.js and slack-cache.js are copies of the slack
// mod's (scripts/link-dotfiles.bash).

import { createSlack } from "./slack.js";
import { CACHE_FILE, needsYou, refreshCache } from "./slack-cache.js";

const ICON = (name) => `icons-juan/${name}.svg`;

const failure = (r, what) => new Error((r.stderr || r.stdout || "").trim().split("\n").slice(-1)[0] || `${what} exited ${r.code}`);

// Notification threads not marked done, read or unread, as the inbox mod
// lists them (is_done=false works though GitHub doesn't document it). Each check sends the last ETag: GitHub answers
// 304 when nothing changed, and a 304 doesn't count against the rate limit.
// X-Poll-Interval is how often GitHub allows polling.
function github(exec) {
  return {
    id: "github",
    icon: ICON("github"),
    title: "GitHub",
    open: "inbox",
    every: 60_000,
    async check(memo) {
      const args = ["api", "-i"];
      if (memo?.etag) args.push("-H", `If-None-Match: ${memo.etag}`);
      args.push("/notifications?all=true&is_done=false&per_page=50", "--jq", "length");
      const r = await exec("gh", args, { timeout: 30_000 });
      const { status, headers, body } = parseResponse(r.stdout ?? "");
      const interval = Number(headers["x-poll-interval"]) * 1000 || undefined;
      if (status === 304) return { unchanged: true, interval };
      if (r.code !== 0 || status !== 200) throw failure(r, "gh");
      return { count: Number(body.trim()), more: /rel="next"/.test(headers.link ?? ""), memo: { etag: headers.etag }, interval };
    },
  };
}

// gh api -i prints the status line, the headers, a blank line, then the body.
function parseResponse(text) {
  const end = text.search(/\r?\n\r?\n/);
  const head = end < 0 ? text : text.slice(0, end);
  const body = end < 0 ? "" : text.slice(end).replace(/^\r?\n\r?\n/, "");
  const [statusLine = "", ...lines] = head.split(/\r?\n/);
  const headers = {};
  for (const line of lines) {
    const i = line.indexOf(":");
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return { status: Number(statusLine.split(" ")[1]) || 0, headers, body };
}

// Unread threads in the inbox. gog finds its account and keyring only through
// GOG_* variables that ~/.zshenv exports and Herdr's exec doesn't pass, so it
// runs under zsh. Gmail leaves threadsUnread out when it is 0.
function gmail(exec) {
  return {
    id: "gmail",
    icon: ICON("gmail"),
    title: "Mail",
    open: "mail",
    every: 120_000,
    async check() {
      const r = await exec("zsh", ["-c", 'exec gog "$@"', "zsh", "gmail", "labels", "get", "INBOX", "--json"], { timeout: 30_000 });
      if (r.code !== 0) throw failure(r, "gog");
      return { count: JSON.parse(r.stdout).label.threadsUnread ?? 0 };
    },
  };
}

// Conversations that need Juan in Slack (needsYou), from one client.counts
// with the Slack desktop app's session, read once (a keychain call) and again
// only after Slack refuses it. When the counts move while the Slack dialog is
// closed, the check also refreshes the dialog's cache, so the dialog opens on
// the new messages; unchanged counts read nothing more.
function slack({ exec, readTextFile, writeTextFile, home, dialogOpen }) {
  let client = null;
  let settled = null; // the counts the cache last caught up with
  const synced = new Map();
  const path = () => `${home()}/${CACHE_FILE}`;
  return {
    id: "slack",
    icon: ICON("slack"),
    title: "Slack",
    open: "slack",
    every: 60_000,
    async check() {
      if (!client) {
        const r = await exec("zsh", ["-c", "exec slack-session"], { timeout: 20_000 });
        if (r.code !== 0) throw failure(r, "slack-session");
        client = createSlack(JSON.parse(r.stdout));
      }
      let raw;
      try {
        raw = await client.rawCounts();
      } catch (e) {
        if (/refused the session/.test(e?.message)) client = null;
        throw e;
      }
      const counts = JSON.stringify([raw.channels, raw.mpims, raw.ims, raw.threads]);
      if (counts !== settled && !dialogOpen()) {
        const done = await refreshCache({
          client, raw, synced,
          read: () => readTextFile(path()),
          write: (text, expected) => writeTextFile(path(), text, expected),
        }).catch(() => false);
        if (done) settled = counts;
      }
      return { count: needsYou(raw) };
    },
  };
}

export const createSources = (herdr) => [github(herdr.exec), gmail(herdr.exec), slack(herdr)];
