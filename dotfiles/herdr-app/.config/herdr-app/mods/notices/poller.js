// Decides when each source is checked and keeps what the last check said.
// A source is due when its interval has passed since its last check; a failed
// check doubles the wait, up to MAX_BACKOFF_MS. Nothing is checked while the
// window is in the background, and a source is never checked twice at once.
// A poke makes a source due within POKE_DELAY_MS, whatever its interval, and
// drops its memo, so that check reads the whole answer: GitHub may answer 304
// to the old ETag after a thread is marked done. A poke that brings the count
// shows it at once and leaves the check for the usual interval, since the
// change it reports may still be on its way to the source.
//
// The state (when each source is due, its memo and its last result) goes to
// save() after every check and comes back from load(), so a restart shows the
// last counts at once and keeps the schedule.

export const POKE_DELAY_MS = 2_000;
export const MAX_BACKOFF_MS = 15 * 60_000;

export function createPoller({ sources, now, load, save }) {
  const state = load() ?? {};
  const running = new Set();
  const poked = new Set();
  const of = (id) => (state[id] ??= { due: 0 });

  async function check(source) {
    const s = of(source.id);
    running.add(source.id);
    const before = JSON.stringify(result(s));
    try {
      const r = await source.check(s.memo);
      if (r.memo !== undefined) s.memo = r.memo;
      if (!r.unchanged) {
        s.count = r.count;
        s.more = Boolean(r.more);
      }
      s.error = null;
      s.failures = 0;
      s.interval = Math.max(source.every, r.interval ?? 0);
      s.due = now() + s.interval;
    } catch (e) {
      s.error = String(e?.message ?? e);
      s.failures = (s.failures ?? 0) + 1;
      s.due = now() + Math.min(MAX_BACKOFF_MS, (s.interval ?? source.every) * 2 ** s.failures);
    } finally {
      running.delete(source.id);
    }
    if (poked.delete(source.id)) {
      s.memo = undefined;
      s.due = Math.min(s.due, now() + POKE_DELAY_MS);
    }
    save(state);
    return JSON.stringify(result(s)) !== before;
  }

  const result = (s) => ({ count: s.count ?? null, more: s.more ?? false, error: s.error ?? null });

  return {
    // Checks every due source. Resolves to true when a count or an error changed.
    async tick({ active }) {
      if (!active) return false;
      const t = now();
      const due = sources.filter((src) => !running.has(src.id) && t >= of(src.id).due);
      const changed = await Promise.all(due.map(check));
      return changed.some(Boolean);
    },

    // count, when given, is the source's new count as the poker knows it.
    poke(id, count) {
      if (!sources.some((src) => src.id === id)) return;
      if (running.has(id)) poked.add(id);
      const s = of(id);
      s.memo = undefined;
      if (Number.isInteger(count)) {
        Object.assign(s, { count, more: false, error: null, due: now() + (s.interval ?? 0) });
      } else {
        s.due = Math.min(s.due, now() + POKE_DELAY_MS);
      }
      save(state);
    },

    // Each source with its last result: count is null until a check succeeds.
    entries() {
      return sources.map(({ id, icon, title, open }) => ({ id, icon, title, open, ...result(of(id)) }));
    },
  };
}
