// Claude and Codex plan usage for the Spaces screen. `dev herdr usage` asks
// both on the definition machine with pi's tokens; Claude's answer is read
// as desktop's workbench reads it (claude-usage.js links its usage.js).
// Anthropic rate limits the endpoint and desktop asks it too, so a check
// waits 5 minutes after the last attempt and doubles that after a failure,
// up to 30 minutes. The state lives in shared("usage"), kept across restarts.

import { exec } from "herdr";
import { usageWindows } from "./claude-usage.js";

export const USAGE_KEY = "usage";
const EVERY = 5 * 60_000;
const MAX_WAIT = 30 * 60_000;
const STALE = 30 * 60_000;

export const usageDue = (state, now) => state?.attemptAt == null || now - state.attemptAt >= (state.waitMs ?? EVERY);

const clamp = (v) => Math.min(100, Math.max(0, v));

function codexWindows(body) {
  const windows = [];
  for (const w of [body?.rate_limit?.primary_window, body?.rate_limit?.secondary_window]) {
    if (typeof w?.used_percent !== "number") continue;
    const s = w.limit_window_seconds ?? 0;
    const label = s >= 6 * 86400 ? "Week" : s >= 86400 ? "Day" : `${Math.round(s / 3600)}h`;
    windows.push({ label, usedPercent: clamp(w.used_percent), ...(typeof w.reset_at === "number" ? { resetAt: w.reset_at } : {}) });
  }
  return windows;
}

const PLANS = [["claude", "Claude", usageWindows], ["codex", "Codex", codexWindows]];

// One attempt on the machine. Resolves to the next state; never rejects.
// A plan that fails keeps its last windows and records why.
export async function fetchUsage(state, machine, now) {
  const attemptAt = state?.attemptAt ?? now;
  let answers = null;
  try {
    const r = await exec("dev", ["herdr", "usage"], { on: machine });
    if (r.code === 0) answers = JSON.parse(r.stdout);
  } catch {}
  const next = { ...state, attemptAt };
  let failed = !answers;
  for (const [key, , parse] of PLANS) {
    const a = answers?.[key];
    if (a?.status === 200 && a.body) {
      next[key] = { windows: parse(a.body), fetchedAt: now, failure: null };
    } else {
      failed = true;
      const failure = a?.status === -1 || a?.status === 401 ? "sign in again" : "refresh failed";
      next[key] = { ...state?.[key], failure };
    }
  }
  next.waitMs = failed ? Math.min(MAX_WAIT, 2 * (state?.waitMs ?? EVERY)) : EVERY;
  return next;
}

// What the screen draws: a row per plan with windows, or with a failure.
export function usageRows(state, now) {
  return PLANS.flatMap(([key, name]) => {
    const p = state?.[key];
    if (!p?.windows?.length && !p?.failure) return [];
    return [{ key, name, windows: p.windows ?? [], failure: p.failure ?? null, stale: now - (p.fetchedAt ?? 0) > STALE }];
  });
}
