import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchUsage, usageDue, usageRow } from "./usage.js";

const MIN = 60_000;
const AUTH = JSON.stringify({ anthropic: { type: "oauth", access: "token-1" } });
// The shape of a real answer from /api/oauth/usage, with extra usage on.
const ANSWER = {
  five_hour: { utilization: 99.5, resets_at: "2026-11-17T18:00:00.000000+00:00" },
  seven_day: { utilization: 14, resets_at: "2026-11-21T22:59:59.000000+00:00" },
  extra_usage: { is_enabled: true, used_credits: 1234, monthly_limit: 5000, utilization: 24.68 },
};

function port({ status = 200, body = ANSWER, auth = AUTH, now = 0 } = {}) {
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

test("maps the 5h, weekly and extra usage windows and sends pi's token", async () => {
  const p = port({ now: 1000 });
  const state = await fetchUsage({ attemptAt: 1000 }, p);
  assert.deepEqual(state.windows, [
    { label: "5h", usedPercent: 99.5, durationSeconds: 18000, resetAt: 1794938400 },
    { label: "Week", usedPercent: 14, durationSeconds: 604800, resetAt: 1795301999 },
    { label: "Extra [active] 12.34/50.00", usedPercent: 24.68 },
  ]);
  assert.equal(p.requests[0].options.headers.Authorization, "Bearer token-1");
  assert.deepEqual(usageRow(state, 1000), { name: "Claude Plan", windows: state.windows, stale: false, failure: null });
});

test("asks again 5 minutes after an attempt, waiting twice as long after each failure up to 30 minutes", async () => {
  let state = await fetchUsage({ attemptAt: 0 }, port());
  assert.equal(usageDue(state, 5 * MIN - 1), false);
  assert.equal(usageDue(state, 5 * MIN), true);
  const waits = [];
  for (let i = 0; i < 4; i++) {
    state = await fetchUsage({ ...state, attemptAt: 0 }, port({ status: 429 }));
    waits.push(state.waitMs / MIN);
  }
  assert.deepEqual(waits, [10, 20, 30, 30]);
  state = await fetchUsage({ ...state, attemptAt: 0 }, port());
  assert.equal(state.waitMs, 5 * MIN);
});

test("a failure keeps the last windows, shown cached and then stale after 30 minutes", async () => {
  const good = await fetchUsage({ attemptAt: 0 }, port());
  const failed = await fetchUsage({ ...good, attemptAt: MIN }, port({ status: 429 }));
  assert.deepEqual(failed.windows, good.windows);
  assert.equal(usageRow(failed, 2 * MIN).failure, "refresh_failed");
  assert.equal(usageRow(failed, 2 * MIN).stale, false);
  assert.equal(usageRow(failed, 31 * MIN).stale, true);
  const signedOut = await fetchUsage(good, port({ auth: null }));
  assert.equal(signedOut.failure, "sign_in_again");
});
