import { test } from "node:test";
import assert from "node:assert/strict";
import { createPoller, MAX_BACKOFF_MS, POKE_DELAY_MS } from "./poller.js";

function setup(behaviours) {
  const clock = { t: 1_000_000 };
  const calls = [];
  const sources = Object.entries(behaviours).map(([id, check]) => ({
    id, icon: "", title: id, open: id, every: 60_000,
    check: (memo) => { calls.push({ id, memo }); return check(memo); },
  }));
  let saved = null;
  const make = () => createPoller({ sources, now: () => clock.t, load: () => saved && JSON.parse(saved), save: (s) => { saved = JSON.stringify(s); } });
  return { clock, calls, poller: make(), restart: make };
}
const active = { active: true };
const entry = (poller, id) => poller.entries().find((e) => e.id === id);

test("checks a source when due and not before", async () => {
  const { clock, calls, poller } = setup({ a: async () => ({ count: 3 }) });
  assert.equal(await poller.tick(active), true);
  assert.equal(entry(poller, "a").count, 3);
  clock.t += 59_000;
  await poller.tick(active);
  assert.equal(calls.length, 1);
  clock.t += 1_000;
  await poller.tick(active);
  assert.equal(calls.length, 2);
});

test("waits longer when the source asks for it", async () => {
  const { clock, calls, poller } = setup({ a: async () => ({ count: 1, interval: 120_000 }) });
  await poller.tick(active);
  clock.t += 60_000;
  await poller.tick(active);
  assert.equal(calls.length, 1);
  clock.t += 60_000;
  await poller.tick(active);
  assert.equal(calls.length, 2);
});

test("checks nothing while the window is in the background", async () => {
  const { calls, poller } = setup({ a: async () => ({ count: 1 }) });
  assert.equal(await poller.tick({ active: false }), false);
  assert.equal(calls.length, 0);
});

test("keeps the count and passes the memo back when unchanged", async () => {
  let n = 0;
  const { clock, calls, poller } = setup({ a: async () => (n++ ? { unchanged: true } : { count: 4, memo: { etag: "x" } }) });
  await poller.tick(active);
  clock.t += 60_000;
  assert.equal(await poller.tick(active), false);
  assert.deepEqual(calls[1].memo, { etag: "x" });
  assert.equal(entry(poller, "a").count, 4);
});

test("backs off after failures up to the cap, keeps the last count, and recovers", async () => {
  let fail = false;
  const { clock, calls, poller } = setup({ a: async () => { if (fail) throw new Error("offline"); return { count: 2 }; } });
  await poller.tick(active);
  fail = true;
  clock.t += 60_000;
  assert.equal(await poller.tick(active), true);
  assert.deepEqual([entry(poller, "a").count, entry(poller, "a").error], [2, "offline"]);
  clock.t += 119_000;
  await poller.tick(active);
  assert.equal(calls.length, 2);
  clock.t += 1_000;
  await poller.tick(active);
  assert.equal(calls.length, 3);
  for (let i = 0; i < 6; i++) { clock.t += MAX_BACKOFF_MS; await poller.tick(active); }
  const before = calls.length;
  clock.t += MAX_BACKOFF_MS;
  await poller.tick(active);
  assert.equal(calls.length, before + 1);
  fail = false;
  clock.t += MAX_BACKOFF_MS;
  await poller.tick(active);
  assert.equal(entry(poller, "a").error, null);
  clock.t += 60_000;
  await poller.tick(active);
  assert.equal(calls.length, before + 3);
});

test("a poke makes a source due soon, even while backing off", async () => {
  const { clock, calls, poller } = setup({ a: async () => { throw new Error("down"); } });
  await poller.tick(active);
  poller.poke("a");
  clock.t += POKE_DELAY_MS;
  await poller.tick(active);
  assert.equal(calls.length, 2);
});

test("a poke during a check makes the source due again after it", async () => {
  let finish;
  let n = 0;
  const { clock, calls, poller } = setup({ a: () => (n++ ? Promise.resolve({ count: 1 }) : new Promise((resolve) => { finish = resolve; })) });
  const first = poller.tick(active);
  poller.poke("a");
  await poller.tick(active);
  assert.equal(calls.length, 1);
  finish({ count: 1 });
  await first;
  clock.t += POKE_DELAY_MS;
  await poller.tick(active);
  assert.equal(calls.length, 2);
});

test("a poke drops the memo so the next check reads the whole answer", async () => {
  const { clock, calls, poller } = setup({ a: async () => ({ count: 4, memo: { etag: "x" } }) });
  await poller.tick(active);
  poller.poke("a");
  clock.t += POKE_DELAY_MS;
  await poller.tick(active);
  assert.equal(calls[1].memo, undefined);
});

test("a poke with a count shows it at once and checks at the usual interval", async () => {
  const { clock, calls, poller } = setup({ a: async () => ({ count: 4, memo: { etag: "x" } }) });
  await poller.tick(active);
  poller.poke("a", 3);
  assert.equal(entry(poller, "a").count, 3);
  clock.t += 59_000;
  await poller.tick(active);
  assert.equal(calls.length, 1);
  clock.t += 1_000;
  await poller.tick(active);
  assert.equal(calls[1].memo, undefined);
});

test("reports a change only when a count or error changes", async () => {
  const { clock, poller } = setup({ a: async () => ({ count: 5 }) });
  assert.equal(await poller.tick(active), true);
  clock.t += 60_000;
  assert.equal(await poller.tick(active), false);
});

test("a restart keeps the counts and the schedule", async () => {
  const { clock, calls, poller, restart } = setup({ a: async () => ({ count: 7 }) });
  await poller.tick(active);
  const again = restart();
  assert.equal(entry(again, "a").count, 7);
  clock.t += 30_000;
  await again.tick(active);
  assert.equal(calls.length, 1);
});
