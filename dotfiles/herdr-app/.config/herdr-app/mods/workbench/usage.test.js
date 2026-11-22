import { test } from "node:test";
import assert from "node:assert/strict";
import { PROVIDERS, fetchUsage, pace, usageDue, usageRows } from "./usage.js";

const [CLAUDE, CODEX] = PROVIDERS;
const MIN = 60_000;
const AUTH = JSON.stringify({ anthropic: { type: "oauth", access: "token-1" }, "openai-codex": { type: "oauth", access: "token-2", accountId: "acct-1" } });
// The shape of a real answer from /api/oauth/usage, with extra usage on.
const CLAUDE_ANSWER = {
  five_hour: { utilization: 99.5, resets_at: "2026-11-17T18:00:00.000000+00:00" },
  seven_day: { utilization: 14, resets_at: "2026-11-21T22:59:59.000000+00:00" },
  extra_usage: { is_enabled: true, used_credits: 1234, monthly_limit: 5000, utilization: 24.68 },
};
// The shape of a real answer from ChatGPT's /wham/usage, with both windows.
const CODEX_ANSWER = {
  rate_limit: {
    primary_window: { used_percent: 7, limit_window_seconds: 604800, reset_at: 1795377403 },
    secondary_window: { used_percent: 30, limit_window_seconds: 18000, reset_at: 1795000000 },
  },
};

function port({ status = 200, body = CLAUDE_ANSWER, auth = AUTH, now = 0 } = {}) {
  const requests = [];
  return {
    requests,
    readTextFile: async () => auth,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: status < 300, status, json: async () => body };
    },
    home: "/Users/juan",
    now: () => now,
  };
}

const rows = (states, now) => usageRows((key) => states[key], now);

test("maps Claude's 5h, weekly and extra usage windows and sends pi's token", async () => {
  const p = port({ now: 1000 });
  const state = await fetchUsage(CLAUDE, { attemptAt: 1000 }, p);
  assert.deepEqual(state.windows, [
    { name: "5h", usedPercent: 99.5, seconds: 18000, resetAt: 1794938400 },
    { name: "7d", usedPercent: 14, seconds: 604800, resetAt: 1795301999 },
    { name: "$", usedPercent: 24.68, detail: "12/50", active: true },
  ]);
  assert.equal(p.requests[0].options.headers.Authorization, "Bearer token-1");
});

test("maps Codex's windows shortest first and sends pi's token and account", async () => {
  const p = port({ body: CODEX_ANSWER });
  const state = await fetchUsage(CODEX, { attemptAt: 0 }, p);
  assert.deepEqual(state.windows, [
    { name: "5h", usedPercent: 30, seconds: 18000, resetAt: 1795000000 },
    { name: "7d", usedPercent: 7, seconds: 604800, resetAt: 1795377403 },
  ]);
  assert.equal(p.requests[0].url, "https://chatgpt.com/backend-api/wham/usage");
  assert.deepEqual(p.requests[0].options.headers, { Authorization: "Bearer token-2", "ChatGPT-Account-Id": "acct-1" });
});

test("the Usage section lists Claude then Codex, skipping a provider without windows", async () => {
  const claude = await fetchUsage(CLAUDE, { attemptAt: 0 }, port());
  const codex = await fetchUsage(CODEX, { attemptAt: 0 }, port({ body: CODEX_ANSWER }));
  assert.deepEqual(rows({ [CLAUDE.key]: claude, [CODEX.key]: codex }, 0).map((g) => g.name), ["Claude", "Codex"]);
  assert.deepEqual(rows({ [CODEX.key]: codex }, 0).map((g) => g.name), ["Codex"]);
  assert.deepEqual(rows({}, 0), []);
});

test("asks again 5 minutes after an attempt, waiting twice as long after each failure up to 30 minutes", async () => {
  let state = await fetchUsage(CLAUDE, { attemptAt: 0 }, port());
  assert.equal(usageDue(state, 5 * MIN - 1), false);
  assert.equal(usageDue(state, 5 * MIN), true);
  const waits = [];
  for (let i = 0; i < 4; i++) {
    state = await fetchUsage(CLAUDE, { ...state, attemptAt: 0 }, port({ status: 429 }));
    waits.push(state.waitMs / MIN);
  }
  assert.deepEqual(waits, [10, 20, 30, 30]);
  state = await fetchUsage(CLAUDE, { ...state, attemptAt: 0 }, port());
  assert.equal(state.waitMs, 5 * MIN);
});

test("a failure keeps the last windows, shown cached and then stale after 30 minutes", async () => {
  const good = await fetchUsage(CLAUDE, { attemptAt: 0 }, port());
  const failed = await fetchUsage(CLAUDE, { ...good, attemptAt: MIN }, port({ status: 429 }));
  assert.deepEqual(failed.windows, good.windows);
  const [at2] = rows({ [CLAUDE.key]: failed }, 2 * MIN);
  assert.equal(at2.failure, "refresh_failed");
  assert.equal(at2.stale, false);
  assert.equal(rows({ [CLAUDE.key]: failed }, 31 * MIN)[0].stale, true);
  const signedOut = await fetchUsage(CLAUDE, good, port({ auth: null }));
  assert.equal(signedOut.failure, "sign_in_again");
});

test("pace projects use at reset from the share of the window passed", () => {
  const DAY = 86400;
  const week = { name: "7d", usedPercent: 70, seconds: 7 * DAY, resetAt: 7 * DAY };
  // Halfway through the week, 70% used is on pace for 140%.
  assert.deepEqual(pace(week, 3.5 * DAY), { expected: 50, projected: 140 });
  // Early in the window too: 70% used after a twentieth of it projects to 1400%.
  const early = pace(week, 0.35 * DAY);
  assert.deepEqual([Math.round(early.expected), Math.round(early.projected)], [5, 1400]);
  // After the reset and for extra usage: no pace.
  assert.equal(pace(week, 7 * DAY), null);
  assert.equal(pace({ name: "$", usedPercent: 20, detail: "4/20" }, 0), null);
});
