// What the sidebar shows below the sessions for one folder on one machine:
// the pi session running in a terminal, its plans and skills, gob jobs and
// System. Each source is one exec on the target machine, run in parallel;
// a source that fails is null and leaves the others. port is
// { exec, readTextFile, now? }: Herdr's in the mod, a fake in the tests. This
// file imports nothing from "herdr" so node --test can load it.

const PLAN_ORIGIN = "http://127.0.0.1:19433";

const MAX_ITEMS = 16;
const MAX_DEPTH = 64;
// Separates the parts of one command's output: JSON escapes it.
const SEP = "\x1e";

const SYSTEM = `case $(uname) in
Darwin)
  echo darwin; top -l 2 -n 0 -s 0 | grep '^CPU usage'
  printf '\\036'; vm_stat; sysctl -n hw.memsize
  printf '\\036'; pmset -g batt ;;
Linux)
  echo linux; head -1 /proc/stat; sleep 0.2; head -1 /proc/stat
  printf '\\036'; grep -E '^(MemTotal|MemAvailable):' /proc/meminfo
  printf '\\036'
  for d in /sys/class/power_supply/*; do
    [ "$(cat "$d/type" 2>/dev/null)" = Battery ] || continue
    [ "$(cat "$d/present" 2>/dev/null)" = 0 ] && continue
    echo "$(cat "$d/capacity" 2>/dev/null) $(cat "$d/status" 2>/dev/null)"
  done ;;
esac`;

const GOB = `command -v gob >/dev/null 2>&1 || { echo "[]"; exit 0; }; exec gob list --json`;

const PI = `echo "$HOME"; ps -A -o pid=,ppid=
for f in "$HOME"/.local/share/pi/status/*.json; do [ -f "$f" ] && { printf '\\036'; cat "$f"; }; done; true`;

function parseJobs(stdout, dir, now) {
  return JSON.parse(stdout)
    .filter((j) => j.status === "running" && j.workdir === dir)
    .map((j) => {
      const started = Date.parse(j.started_at);
      const known = Number.isFinite(started) && j.expected_duration_ms > 0;
      return {
        id: j.id,
        name: j.description?.trim() || j.command?.join(" ") || j.id,
        elapsedMs: known ? Math.max(0, now - started) : null,
        typicalMs: known ? j.expected_duration_ms : null,
        upperMs: known ? Math.max(j.expected_upper_duration_ms ?? 0, j.expected_duration_ms) : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const percent = (value) => (Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : null);

function parseSystem(stdout) {
  const [cpuPart = "", memPart = "", batPart = ""] = stdout.split(SEP);
  const [os, ...cpuLines] = cpuPart.trim().split("\n");
  if (os === "darwin") {
    const idle = cpuLines.map((l) => l.match(/([\d.]+)% idle/)?.[1]).filter(Boolean).pop();
    const pages = (name) => Number(memPart.match(new RegExp(`^${name}:\\s+(\\d+)`, "m"))?.[1]);
    const size = Number(memPart.match(/page size of (\d+) bytes/)?.[1]);
    const total = Number(memPart.trim().split("\n").pop());
    const used = (pages("Anonymous pages") - pages("Pages purgeable") + pages("Pages wired down") + pages("Pages occupied by compressor")) * size;
    const line = batPart.split("\n").find((l) => l.includes("%"));
    const level = line?.match(/(\d+)%/)?.[1];
    return {
      cpu: idle == null ? null : percent(100 - Number(idle)),
      memory: total > 0 ? percent((100 * used) / total) : null,
      battery: level == null ? null : {
        percent: Number(level),
        charging: line.includes("charging") && !line.includes("discharging"),
        full: line.includes("charged") || line.includes("finishing charge"),
      },
    };
  }
  if (os === "linux") {
    const [a, b] = cpuLines.map((l) => l.trim().split(/\s+/).slice(1, 9).map(Number));
    let cpu = null;
    if (a && b) {
      const total = b.reduce((s, n) => s + n, 0) - a.reduce((s, n) => s + n, 0);
      const idle = b[3] + b[4] - a[3] - a[4];
      cpu = total > 0 ? percent((100 * (total - idle)) / total) : null;
    }
    const kb = (name) => Number(memPart.match(new RegExp(`^${name}:\\s+(\\d+)`, "m"))?.[1]);
    const total = kb("MemTotal");
    const batteries = batPart.trim().split("\n").filter(Boolean)
      .map((l) => { const [n, ...state] = l.split(" "); return { level: Number(n), state: state.join(" ").trim() }; })
      .filter((x) => Number.isInteger(x.level) && x.level <= 100);
    return {
      cpu,
      memory: total > 0 ? percent((100 * (total - kb("MemAvailable"))) / total) : null,
      battery: batteries.length ? {
        percent: Math.floor(batteries.reduce((s, x) => s + x.level, 0) / batteries.length),
        charging: batteries.some((x) => x.state === "Charging"),
        full: batteries.every((x) => x.state === "Full"),
      } : null,
    };
  }
  return null;
}

// The newest live session record whose process runs under pid.
function findSession(stdout, pid) {
  const [head, ...records] = stdout.split(SEP);
  const [home, ...ps] = head.split("\n");
  const parents = new Map();
  for (const line of ps) {
    const [p, pp] = line.trim().split(/\s+/).map(Number);
    if (p) parents.set(p, pp);
  }
  const descends = (p) => {
    for (let i = 0; i < MAX_DEPTH && p; i++) {
      if (p === pid) return true;
      p = parents.get(p);
    }
    return false;
  };
  let best = null;
  for (const text of records) {
    let r;
    try { r = JSON.parse(text); } catch { continue; }
    if (r?.version !== 2 || !r.sessionId || !["idle", "working"].includes(r.state) || !descends(r.pid)) continue;
    if (!best || (r.updatedAt ?? "") > (best.updatedAt ?? "")) best = r;
  }
  return best && { home: home.trim(), record: best };
}

function parseContext(text, path, sessionId, home) {
  if (text == null) return { plans: [], skills: [] };
  const c = JSON.parse(text);
  if (c?.version !== 2 || c.sessionId !== sessionId) return null;
  const data = (name) => (c.extensions?.[name]?.version === 1 ? c.extensions[name].data : null);
  const dir = path.slice(0, path.lastIndexOf("/"));
  const plans = (data("pi-plans")?.plans ?? []).slice(0, MAX_ITEMS).filter((p) => p?.title && p.path).map((p) => {
    const file = `${dir}/${p.path}`;
    const id = file.split("/").pop().replace(/\.md$/, "");
    return { title: p.title, path: file, url: `${PLAN_ORIGIN}/plans/${sessionId}/${id}` };
  });
  const skillData = data("pi-skills");
  const skills = (skillData?.skills ?? []).slice(0, MAX_ITEMS).filter((s) => typeof s === "string").map((name) => ({
    name,
    path: skillData.skillPaths?.[name] ?? `${home}/.agents/skills/${name}/SKILL.md`,
  }));
  return { plans, skills };
}

async function pi(machine, pid, { exec, readTextFile }) {
  const r = await exec("sh", ["-c", PI], { on: machine });
  if (r.code !== 0) throw new Error(r.stderr || `pi lookup exited ${r.code}`);
  const found = findSession(r.stdout, pid);
  if (!found) return null;
  const { home, record } = found;
  let context = { plans: [], skills: [] };
  if (record.contextPath) {
    try {
      context = parseContext(await readTextFile(record.contextPath, { on: machine }), record.contextPath, record.sessionId, home);
    } catch {
      context = null;
    }
  }
  return {
    session: { id: record.sessionId, name: record.name?.trim() || record.sessionId.slice(0, 8), state: record.state },
    context,
  };
}

async function jobs(machine, dir, { exec, now }) {
  const r = await exec("sh", ["-c", GOB], { cwd: dir, on: machine });
  return r.code === 0 ? parseJobs(r.stdout, dir, now()) : [];
}

async function system(machine, { exec }) {
  const r = await exec("sh", ["-c", SYSTEM], { on: machine });
  return r.code === 0 ? parseSystem(r.stdout) : null;
}

// Resolves to { pi, jobs, system }. options.system set to false skips that
// source, which comes back null. Rejects only when every
// source that ran threw (the machine is away), so the caller keeps what it had.
export async function snapshot({ machine = null, dir, pid = null }, port, { system: withSystem = true } = {}) {
  const p = { now: Date.now, ...port };
  const sources = [
    pid ? pi(machine, pid, p) : null,
    jobs(machine, dir, p),
    withSystem ? system(machine, p) : null,
  ];
  const settled = await Promise.allSettled(sources.map((s) => s ?? Promise.resolve(null)));
  const ran = sources.filter(Boolean).length;
  const failed = settled.filter((s, i) => sources[i] && s.status === "rejected");
  if (ran && failed.length === ran) throw failed[0].reason;
  const [piValue, jobsValue, systemValue] = settled.map((s) => (s.status === "fulfilled" ? s.value : null));
  return { pi: piValue, jobs: jobsValue ?? [], system: systemValue };
}
