// Claude and Codex plan usage, fetched on this Mac with pi's tokens. The
// endpoints rate limit (429) and their Retry-After can't be read through
// Herdr's fetch, so a check waits 5 minutes after the last attempt and
// doubles that after each failure, up to 30 minutes. Each provider's state
// lives in shared(provider.key) so it survives restarts. This file imports
// nothing from "herdr" so node --test can load it.

const EVERY = 5 * 60_000;
const MAX_WAIT = 30 * 60_000;
const STALE = 30 * 60_000;

export const usageDue = (state, now) => state?.attemptAt == null || now - state.attemptAt >= (state.waitMs ?? EVERY);

const number = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const clamp = (v) => Math.min(100, Math.max(0, v));

// A window's name from its length: "5h", "7d".
const durationName = (seconds) => (seconds % 86400 === 0 ? `${seconds / 86400}d` : `${Math.round(seconds / 3600)}h`);

// Every provider's windows share one shape: { name, usedPercent, seconds?,
// resetAt?, detail?, active? }. seconds is the window's length; detail
// replaces the reset countdown; active marks extra usage being spent.
function timeWindow(seconds, percent, resetAt) {
  return { name: durationName(seconds), usedPercent: clamp(percent), seconds, ...(resetAt ? { resetAt } : {}) };
}

// How a time window is going at nowSeconds: expected is the percent of the
// window passed, projected the percent used by reset if use keeps this rate.
// Null for extra usage and after the window's reset.
export function pace(w, nowSeconds) {
  if (!w.seconds || !w.resetAt || w.resetAt <= nowSeconds) return null;
  const passed = Math.max(0, 1 - (w.resetAt - nowSeconds) / w.seconds);
  // At the very start, any use at all is ahead of pace.
  if (passed === 0) return { expected: 0, projected: w.usedPercent > 0 ? Infinity : 0 };
  return { expected: passed * 100, projected: w.usedPercent / passed };
}

export function claudeWindows(data) {
  const windows = [];
  for (const [key, seconds] of [["five_hour", 5 * 3600], ["seven_day", 7 * 86400]]) {
    const percent = number(data?.[key]?.utilization);
    if (percent == null) continue;
    const reset = Date.parse(data[key].resets_at);
    windows.push(timeWindow(seconds, percent, Number.isFinite(reset) ? Math.floor(reset / 1000) : null));
  }
  const extra = data?.extra_usage;
  if (extra?.is_enabled === true) {
    // Credits are in cents; the row shows whole dollars spent of the monthly limit.
    const used = Math.round((number(extra.used_credits) ?? 0) / 100);
    const limit = number(extra.monthly_limit);
    windows.push({
      name: "$",
      usedPercent: clamp(number(extra.utilization) ?? 0),
      detail: limit > 0 ? `${used}/${Math.round(limit / 100)}` : `${used}`,
      active: (number(data.five_hour?.utilization) ?? 0) >= 99,
    });
  }
  return windows;
}

// ChatGPT reports up to two windows; which one is 5h or weekly depends on the plan.
export function codexWindows(data) {
  const windows = [];
  for (const w of [data?.rate_limit?.primary_window, data?.rate_limit?.secondary_window]) {
    const percent = number(w?.used_percent);
    if (percent == null) continue;
    const durationSeconds = number(w.limit_window_seconds);
    const resetAt = number(w.reset_at);
    if (durationSeconds) windows.push(timeWindow(durationSeconds, percent, resetAt));
  }
  return windows.sort((a, b) => a.seconds - b.seconds);
}

// Each provider, in the sidebar's order: its shared key, its name in the sidebar, the request built from
// pi's auth.json (null when signed out), and how to read the answer.
export const PROVIDERS = [
  {
    key: "workbench.usage",
    name: "Claude",
    request: (auth) => auth.anthropic?.access && {
      url: "https://api.anthropic.com/api/oauth/usage",
      headers: { Authorization: `Bearer ${auth.anthropic.access}`, "anthropic-beta": "oauth-2025-04-20" },
    },
    windows: claudeWindows,
  },
  {
    key: "workbench.usage.codex",
    name: "Codex",
    request: (auth) => auth["openai-codex"]?.access && {
      url: "https://chatgpt.com/backend-api/wham/usage",
      headers: {
        Authorization: `Bearer ${auth["openai-codex"].access}`,
        ...(auth["openai-codex"].accountId ? { "ChatGPT-Account-Id": auth["openai-codex"].accountId } : {}),
      },
    },
    windows: codexWindows,
  },
];

// One attempt. Resolves to the next state; never rejects.
export async function fetchUsage(provider, state, { readTextFile, fetch, home, now }) {
  const attemptAt = state?.attemptAt ?? now();
  const fail = (failure) => ({ ...state, failure, attemptAt, waitMs: Math.min(MAX_WAIT, 2 * (state?.waitMs ?? EVERY)) });
  try {
    const request = provider.request(JSON.parse((await readTextFile(`${home}/.pi/agent/auth.json`)) ?? "{}"));
    if (!request) return fail("sign_in_again");
    const r = await fetch(request.url, { headers: request.headers });
    if (!r.ok) return fail(r.status === 401 ? "sign_in_again" : "refresh_failed");
    return { fetchedAt: now(), windows: provider.windows(await r.json()), failure: null, attemptAt, waitMs: EVERY };
  } catch {
    return fail("refresh_failed");
  }
}

// The sidebar's Usage section: one group per provider with windows, in
// PROVIDERS order. stateOf(key) reads a provider's shared state.
export function usageRows(stateOf, now) {
  return PROVIDERS.flatMap((provider) => {
    const state = stateOf(provider.key);
    if (!state?.windows?.length) return [];
    return [{ name: provider.name, windows: state.windows, stale: now - (state.fetchedAt ?? 0) > STALE, failure: state.failure ?? null }];
  });
}
