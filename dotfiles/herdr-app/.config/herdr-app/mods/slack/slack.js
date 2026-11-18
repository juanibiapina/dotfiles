// Everything the Slack dialog asks of Slack, through its Web API with the
// session of the Slack desktop app (the `slack-session` script prints its
// xoxc token and d cookie). This file imports nothing from "herdr", so node
// can load it.

const API = "https://slack.com/api/";

const form = (params) => Object.entries(params)
  .filter(([, v]) => v !== undefined && v !== null)
  .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  .join("&");

// client.counts by conversation id. Ids missing from it are closed DMs.
export function countsById(c) {
  const out = {};
  for (const x of [...c.channels, ...c.mpims, ...c.ims]) {
    out[x.id] = { latest: x.latest, lastRead: x.last_read, unread: x.has_unreads, mentions: x.mention_count ?? 0 };
  }
  return out;
}

export function createSlack({ xoxc, xoxd }) {
  async function call(method, params = {}) {
    const r = await fetch(API + method, {
      method: "POST",
      // The d cookie is stored URL-encoded already; encoding it again is invalid_auth.
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: `d=${xoxd}` },
      body: form({ token: xoxc, ...params }),
    });
    if (r.status === 429) throw new Error("Slack is rate limiting; wait a moment");
    let body;
    try {
      body = JSON.parse(await r.text());
    } catch {
      throw new Error(`Slack answered ${r.status}`);
    }
    if (!body.ok) {
      if (body.error === "invalid_auth" || body.error === "not_authed") {
        throw new Error("Slack refused the session; sign in to the Slack desktop app");
      }
      throw new Error(`Slack: ${body.error}`);
    }
    return body;
  }

  async function paged(method, params, key) {
    const out = [];
    for (let cursor; ;) {
      const body = await call(method, { ...params, cursor });
      out.push(...body[key]);
      cursor = body.response_metadata?.next_cursor;
      if (!cursor) return out;
    }
  }

  return {
    async me() {
      const a = await call("auth.test");
      return { userId: a.user_id, teamId: a.team_id, team: a.team, url: a.url };
    },

    conversations: () => paged("users.conversations", {
      types: "public_channel,private_channel,mpim,im", exclude_archived: "true", limit: 999,
    }, "channels"),

    users: () => paged("users.list", { limit: 1000 }, "members"),

    // Unread state of every channel, open DM and thread, in one small
    // answer: Slack's own client polls it.
    rawCounts: () => call("client.counts"),
    counts: async () => countsById(await call("client.counts")),

    history: async (channel, limit = 60) => (await call("conversations.history", { channel, limit })).messages,
    replies: async (channel, ts) => (await call("conversations.replies", { channel, ts, limit: 200 })).messages,
    post: async (channel, text, threadTs) => (await call("chat.postMessage", {
      channel, text, thread_ts: threadTs, link_names: "true",
    })).message,
    close: (channel) => call("conversations.close", { channel }),
    leave: (channel) => call("conversations.leave", { channel }),
    mark: (channel, ts) => call("conversations.mark", { channel, ts }),
    bot: async (id) => (await call("bots.info", { bot: id })).bot,
    openIm: async (user) => (await call("conversations.open", { users: user, return_im: "true" })).channel,
  };
}
