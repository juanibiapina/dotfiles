// Claude Plan usage, fetched on this Mac with pi's Anthropic token. The
// endpoint rate limits (429) and its Retry-After can't be read through
// Herdr's fetch, so a check waits 5 minutes after the last attempt and
// doubles that after each failure, up to 30 minutes. The state lives in
// shared("workbench.usage") so it survives restarts. This file imports
// nothing from "herdr" so node --test can load it.

export const USAGE_KEY = "workbench.usage";
const URL = "https://api.anthropic.com/api/oauth/usage";
const EVERY = 5 * 60_000;
const MAX_WAIT = 30 * 60_000;
const STALE = 30 * 60_000;

export const usageDue = (state, now) => state?.attemptAt == null || now - state.attemptAt >= (state.waitMs ?? EVERY);

const number = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const clamp = (v) => Math.min(100, Math.max(0, v));

export function usageWindows(data) {
  const windows = [];
  for (const [key, label, durationSeconds] of [["five_hour", "5h", 5 * 3600], ["seven_day", "Week", 7 * 86400]]) {
    const percent = number(data?.[key]?.utilization);
    if (percent == null) continue;
    const reset = Date.parse(data[key].resets_at);
    windows.push({ label, usedPercent: clamp(percent), durationSeconds, ...(Number.isFinite(reset) ? { resetAt: Math.floor(reset / 1000) } : {}) });
  }
  const extra = data?.extra_usage;
  if (extra?.is_enabled === true) {
    const status = (number(data.five_hour?.utilization) ?? 0) >= 99 ? "active" : "on";
    const used = ((number(extra.used_credits) ?? 0) / 100).toFixed(2);
    const limit = number(extra.monthly_limit);
    const label = limit > 0 ? `Extra [${status}] ${used}/${(limit / 100).toFixed(2)}` : `Extra [${status}] ${used}`;
    windows.push({ label, usedPercent: clamp(number(extra.utilization) ?? 0) });
  }
  return windows;
}

// One attempt. Resolves to the next state; never rejects.
export async function fetchUsage(state, { readTextFile, fetch, home, now }) {
  const attemptAt = state?.attemptAt ?? now();
  const fail = (failure) => ({ ...state, failure, attemptAt, waitMs: Math.min(MAX_WAIT, 2 * (state?.waitMs ?? EVERY)) });
  try {
    const token = JSON.parse((await readTextFile(`${home}/.pi/agent/auth.json`)) ?? "{}").anthropic?.access;
    if (!token) return fail("sign_in_again");
    const r = await fetch(URL, { headers: { Authorization: `Bearer ${token}`, "anthropic-beta": "oauth-2025-04-20" } });
    if (!r.ok) return fail(r.status === 401 ? "sign_in_again" : "refresh_failed");
    return { fetchedAt: now(), windows: usageWindows(await r.json()), failure: null, attemptAt, waitMs: EVERY };
  } catch {
    return fail("refresh_failed");
  }
}

// The sidebar's Claude Plan row.
export function usageRow(state, now) {
  if (!state?.windows?.length) return null;
  return { name: "Claude Plan", windows: state.windows, stale: now - (state.fetchedAt ?? 0) > STALE, failure: state.failure ?? null };
}
