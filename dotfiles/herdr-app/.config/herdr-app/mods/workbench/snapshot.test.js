import { test } from "node:test";
import assert from "node:assert/strict";
import { snapshot } from "./snapshot.js";

const RS = "\x1e";
const DIR = "/Users/juan/workspace/juanibiapina/dotfiles";
const HOME = "/Users/juan";
const NOW = Date.parse("2026-11-17T15:00:00+01:00");

const GOB = JSON.stringify([
  { id: "4wj", status: "running", command: ["make"], workdir: DIR, started_at: "2026-11-17T14:59:30+01:00", expected_duration_ms: 26843, expected_upper_duration_ms: 88360 },
  { id: "a1", status: "running", command: ["npm", "run", "dev"], description: "Dev server", workdir: DIR, started_at: "2026-11-17T14:00:00+01:00", expected_duration_ms: 0 },
  { id: "b2", status: "running", command: ["sleep", "9"], workdir: "/elsewhere" },
  { id: "c3", status: "stopped", command: ["make"], workdir: DIR },
]);

const DARWIN = `darwin
CPU usage: 4.22% user, 5.91% sys, 89.86% idle 
CPU usage: 3.33% user, 4.66% sys, 92.0% idle 
${RS}Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                                   222451.
Pages wired down:                             359420.
Pages purgeable:                               69232.
Anonymous pages:                             2449815.
Pages occupied by compressor:                  45084.
68719476736
${RS}Now drawing from 'AC Power'
 -InternalBattery-0 (id=36896867)\t80%; charging; 0:40 remaining present: true
`;
const LINUX = `linux
cpu  29402447 2741020 33652793 180362241 4274286 3211911 1333390 0 0 0
cpu  29402547 2741020 33652893 180362441 4274386 3211911 1333390 0 0 0
${RS}MemTotal:        8007632 kB
MemAvailable:    3534096 kB
${RS}`;

const TERMINAL = 40694;
const PS = `    1     0
40694     1
40754 40694
40760 40754
51000     1
51010 51000`;
const record = (sessionId, pid, updatedAt, extra = {}) => JSON.stringify({
  version: 2, sessionId, pid, name: "Sidebar sources", state: "idle", updatedAt,
  contextPath: `${HOME}/.pi/agent/sessions/x/2026_${sessionId}.jsonl.context.json`, ...extra,
});
const PI = `${HOME}\n${PS}\n${RS}${record("old", 40754, "2026-11-17T13:00:00.000Z")}${RS}${record("new", 40760, "2026-11-17T14:00:00.000Z")}${RS}${record("other", 51010, "2026-11-17T14:30:00.000Z")}${RS}{not json`;
const CONTEXT = JSON.stringify({
  version: 2,
  sessionId: "new",
  extensions: {
    "pi-plans": { version: 1, data: { plans: [{ id: "03296fcc5598d18bce48b923", title: "Zero tasks", path: "2026_new.jsonl.plans/03296fcc5598d18bce48b923.md" }] } },
    "pi-skills": { version: 1, data: { skills: ["testing", "plan"], skillPaths: { testing: "/opt/skills/testing/SKILL.md" } } },
  },
});

function fake({ gob = GOB, system = DARWIN, pi = PI, context = CONTEXT, away = false } = {}) {
  const calls = [];
  const reply = (stdout, code = 0) => ({ code, stdout, stderr: "" });
  const exec = async (cmd, args, options) => {
    calls.push({ cmd, args, options });
    if (away) throw new Error("machine away");
    const script = args.join(" ");
    if (script.includes("gob list")) return reply(gob);
    if (script.includes("uname")) return reply(system);
    if (script.includes("ps -A")) return reply(pi);
    throw new Error(`unexpected ${cmd} ${script}`);
  };
  const readTextFile = async (path, options) => {
    calls.push({ read: path, options });
    return path.endsWith(".context.json") ? context : null;
  };
  return { port: { exec, readTextFile, now: () => NOW }, calls };
}

test("jobs lists running jobs in the folder by name, with progress when gob knows how long they take", async () => {
  const { jobs } = await snapshot({ dir: DIR }, fake().port);
  assert.deepEqual(jobs, [
    { id: "a1", name: "Dev server", elapsedMs: null, typicalMs: null, upperMs: null },
    { id: "4wj", name: "make", elapsedMs: 30000, typicalMs: 26843, upperMs: 88360 },
  ]);
});

test("system on macOS reads CPU from top's second sample, memory as sysinfo counts it, and the battery", async () => {
  const { system } = await snapshot({ dir: DIR }, fake().port);
  assert.deepEqual(system, { cpu: 8, memory: 66, battery: { percent: 80, charging: true, full: false } });
});

test("system on Linux reads /proc and has no battery without one", async () => {
  const { system } = await snapshot({ machine: "mini", dir: DIR }, fake({ system: LINUX }).port);
  assert.deepEqual(system, { cpu: 40, memory: 56, battery: null });
});

test("pi finds the newest session running under the terminal's process, with its plans and skills", async () => {
  const { port, calls } = fake();
  const { pi } = await snapshot({ machine: "mini", dir: DIR, pid: TERMINAL }, port);
  assert.deepEqual(pi.session, { id: "new", name: "Sidebar sources", state: "idle" });
  const dir = `${HOME}/.pi/agent/sessions/x`;
  assert.deepEqual(pi.context.plans, [{
    title: "Zero tasks",
    path: `${dir}/2026_new.jsonl.plans/03296fcc5598d18bce48b923.md`,
    url: "http://127.0.0.1:19433/plans/new/03296fcc5598d18bce48b923",
  }]);
  assert.deepEqual(pi.context.skills, [
    { name: "testing", path: "/opt/skills/testing/SKILL.md" },
    { name: "plan", path: `${HOME}/.agents/skills/plan/SKILL.md` },
  ]);
  assert.ok(calls.every((c) => c.options?.on === "mini"));
});

test("pi is null without a terminal process or a session under it, and empty without a context file", async () => {
  assert.equal((await snapshot({ dir: DIR }, fake().port)).pi, null);
  assert.equal((await snapshot({ dir: DIR, pid: 99999 }, fake().port)).pi, null);
  const { pi } = await snapshot({ dir: DIR, pid: TERMINAL }, fake({ context: null }).port);
  assert.deepEqual(pi.context, { plans: [], skills: [] });
});

test("skipped sources come back null and run nothing", async () => {
  const { port, calls } = fake();
  const snap = await snapshot({ dir: DIR }, port, { system: false });
  assert.equal(snap.system, null);
  assert.equal(calls.length, 1);
});

test("a machine that is away rejects, so the caller keeps what it had", async () => {
  await assert.rejects(snapshot({ machine: "mini", dir: DIR, pid: TERMINAL }, fake({ away: true }).port));
});
