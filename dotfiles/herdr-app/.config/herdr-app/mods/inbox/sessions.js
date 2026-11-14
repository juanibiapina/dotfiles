// The sessions on this desktop as routing.js sees them, and the two ways to
// hand a thread to one: send to a running agent, or start pi somewhere new.

import { exec, agents, panes, spaces, terminals, machines, home, openOverlay } from "herdr";
import { inRepo, label } from "./routing.js";
import { gh } from "./github.js";

// Named as the workbench Sessions list names them.
export function listSessions() {
  const byPane = new Map(panes().map((p) => [p.pane, p]));
  const byAddress = new Map(terminals().map((k) => [k.address, k]));
  const machineOf = new Map(spaces().map((s) => [s.id, s.machine ?? null]));
  return agents().map((a) => {
    const p = byPane.get(a.pane);
    const k = byAddress.get(a.address);
    return {
      address: a.address,
      pane: a.pane,
      machine: machineOf.get(a.space) ?? null,
      name: k?.report?.msg || (a.tab_name && !/^\d+$/.test(a.tab_name) ? a.tab_name : a.program?.name || a.title),
      space: a.space_name,
      cwd: p?.cwd ?? null,
      branch: p?.branch ?? null,
      status: a.status,
      labels: k?.labels ?? {},
      recency: a.seq,
    };
  });
}

// Where a new session can start: the repo's open spaces, then its clones on
// machines without one (this computer first), else a fresh clone here.
export async function listPlaces(repo) {
  const open = spaces().filter((s) => inRepo(s.folder, repo))
    .sort((a, b) => (a.machine ? 1 : 0) - (b.machine ? 1 : 0) || a.name.localeCompare(b.name))
    .map((s) => ({ kind: "space", space: { id: s.id, name: s.name, folder: s.folder, machine: s.machine ?? null } }));
  const covered = new Set(open.map((p) => p.space.machine));
  const candidates = [null, ...machines().filter((m) => m.name && m.layout !== "unavailable").map((m) => m.name)].filter((m) => !covered.has(m));
  const clones = await Promise.all(candidates.map(async (machine) => {
    const r = await exec("sh", ["-c", 'cd "$HOME/workspace/$1" 2>/dev/null && pwd -P', "sh", repo], { on: machine, timeout: 10_000 }).catch(() => null);
    return r?.code === 0 ? { kind: "clone", machine, folder: r.stdout.trim() } : null;
  }));
  const places = [...open, ...clones.filter(Boolean)];
  return places.length ? places : [{ kind: "clone-here", repo }];
}

const hc = async (args) => {
  const r = await exec("hc", args);
  if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || `hc ${args[0]} failed`);
};

export async function send(session, text, subject) {
  await hc(["send", session.address, text]);
  const l = label(subject);
  if (l) await hc(["label", session.address, l]);
}

// new-pi and new-space label the new terminal themselves (their `label` prop).
export async function start(place, text, subject) {
  const props = { task: text, ...(label(subject) ? { label: label(subject) } : {}) };
  const popup = (mod, p) => openOverlay({ mod, props: p, kind: "popup", width: 1, height: 1, frame: "none" });
  if (place.kind === "space") return popup("new-pi", { space: place.space.id, folder: place.space.folder, ...props });
  if (place.kind === "clone") return popup("new-space", { folder: place.folder, ...(place.machine ? { machine: place.machine } : {}), ...props });
  return popup("new-space", { folder: await cloneHere(subject.repo), ...props });
}

export async function cloneHere(repo) {
  const dir = `${home()}/workspace/${repo}`;
  if ((await exec("test", ["-d", dir])).code !== 0) await gh(["repo", "clone", repo, dir]);
  return dir;
}
