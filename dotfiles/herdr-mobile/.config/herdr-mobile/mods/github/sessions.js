// The sessions on every machine as routing.js sees them, and the two ways to
// hand a thread to one: send to a running agent, or start one somewhere new.

import { agents, spaces, machines, exec, run, notify } from "herdr";
import { inRepo, label, labelKey, linkIndex, startArgv } from "./routing.js";

const definition = () => machines().find((m) => m.definition)?.name ?? null;

export function listSessions() {
  return agents().filter((a) => a.state === "live").map((a) => ({
    address: a.address,
    machine: a.machine,
    name: a.message || a.title || a.program?.name || a.address,
    space: a.space_name,
    cwd: a.cwd,
    branch: null,
    status: a.status,
    labels: a.labels ?? {},
    recency: a.statusAt ?? a.createdAt ?? 0,
  }));
}

// The live session a thread was last routed to, or null.
export function linkedSession(repo, number) {
  const key = labelKey({ repo, number });
  return key ? linkIndex(listSessions()).get(key)?.[0]?.session ?? null : null;
}

// Where a new session can start: the repo's open spaces, then its clones on
// machines without one, else a fresh clone on the definition machine.
export async function listPlaces(repo) {
  const def = definition();
  const first = (m) => (m === def ? 0 : 1);
  const open = spaces().filter((s) => inRepo(s.folder, repo))
    .sort((a, b) => first(a.machine) - first(b.machine) || a.name.localeCompare(b.name))
    .map((s) => ({ kind: "space", space: { id: s.id, name: s.name, folder: s.folder, machine: s.machine } }));
  const covered = new Set(open.map((p) => p.space.machine));
  const candidates = machines().filter((m) => m.state === "connected" && !covered.has(m.name))
    .sort((a, b) => first(a.name) - first(b.name));
  const clones = await Promise.all(candidates.map(async (m) => {
    const r = await exec("sh", ["-c", 'cd "$HOME/workspace/$1" 2>/dev/null && pwd -P', "sh", repo], { on: m.name }).catch(() => null);
    return r?.code === 0 ? { kind: "clone", machine: m.name, folder: r.stdout.trim() } : null;
  }));
  const places = [...open, ...clones.filter(Boolean)];
  return places.length ? places : [{ kind: "clone-here", repo, machine: def }];
}

// hc names a terminal t7 on its own machine and mini/t7 elsewhere; the app's
// addresses are opaque, so build hc's from the machine and the last segment.
function hcAddress(session) {
  const id = session.address.split("/").pop();
  return session.machine && session.machine !== definition() ? `${session.machine}/${id}` : id;
}

export async function send(session, text, subject) {
  await run("terminal.send", { terminal: session.address, text });
  const l = label(subject);
  if (!l) return;
  const r = await exec("hc", ["label", hcAddress(session), l]).catch((e) => ({ code: 1, stderr: String(e) }));
  if (r.code !== 0) notify({ title: "Sent, but the link wasn't saved", body: (r.stderr || r.stdout || "").trim(), level: "warning" });
}

// The new terminal labels itself with the thread (routing.js startArgv).
export async function start(place, agent, text, subject) {
  const argv = startArgv([agent, text], label(subject) ?? "");
  let r;
  if (place.kind === "space") {
    r = await run("tab.new", { space: place.space.id, name: subject.number ? `#${subject.number}` : agent, argv });
  } else {
    let folder = place.folder;
    if (place.kind === "clone-here") {
      const home = (await exec("sh", ["-c", "cd && pwd -P"])).stdout.trim();
      folder = `${home}/workspace/${subject.repo}`;
      const c = await exec("gh", ["repo", "clone", subject.repo, folder]);
      if (c.code !== 0) throw new Error((c.stderr || c.stdout).trim());
    }
    r = await run("space.new", { machine: place.machine, folder, argv });
  }
  if (r?.terminal) await run("terminal.show", { terminal: r.terminal });
}
