// The repos a session works on, from two labels pi's herdr extension sets on
// its terminal, each "owner/name,owner/name" in first-touch order: `repos`
// holds the repos it wrote to, `related` the repos it only read. A session's
// repos are `repos`, else its last related repo; the last one is its current
// repo. A repo's checkout is $HOME/workspace/<owner>/<name> on the session's
// machine. Sessions without either label are about their folder (cwd).
// scripts/link-dotfiles.bash copies this file into the mods that use it; the
// phone's mods link it.

const list = (value) => String(value ?? "").split(",").map((r) => r.trim()).filter(Boolean);

export function declaredRepos(labels) {
  const written = list(labels?.repos);
  if (written.length) return written;
  return list(labels?.related).slice(-1);
}

export function currentRepo(labels) {
  return declaredRepos(labels).at(-1) ?? null;
}

// The labels of the session a focused pane belongs to: the focused terminal's,
// else the pi agent's in the same tab (a shell split beside pi counts as pi's).
export function focusedLabels(focus, agentList, terminalList) {
  if (!focus) return {};
  const labelsOf = (address) => terminalList.find((k) => k.address === address)?.labels ?? {};
  const own = labelsOf(focus.terminal);
  if (own.repos || own.related) return own;
  const pi = agentList.find((a) => a.tab === focus.tab && a.app === "pi");
  return pi ? labelsOf(pi.address) : own;
}

const byName = (a, b) => (a || "").localeCompare(b || "", undefined, { sensitivity: "base", numeric: true });

// The session lists' groups: each of spaceList's spaces (already filtered and
// sorted by the caller) with its sessions, then one group per current repo
// and machine, local first, then by machine and owner/repo. A session goes
// where its top-level ancestor goes (parent in terminalList), so child
// sessions stay with the session that started them; a labelled one goes to
// its repo, any other to its space. Sessions of spaces not in spaceList are
// left out, and sessions keep agentList's order. machineOf maps a space id
// to its machine (null: here).
// [{ kind: "space", space, agents }, { kind: "repo", repo, machine, agents }]
export function groupSessions(spaceList, agentList, terminalList, machineOf) {
  const byAddress = new Map(terminalList.map((k) => [k.address, k]));
  const rootOf = (address) => {
    const seen = new Set([address]);
    for (let at = address; ;) {
      const parent = byAddress.get(at)?.parent;
      if (!parent || seen.has(parent) || !byAddress.has(parent)) return at;
      seen.add(parent);
      at = parent;
    }
  };
  const spaceGroups = spaceList.map((space) => ({ kind: "space", space, agents: [] }));
  const bySpace = new Map(spaceGroups.map((g) => [g.space.id, g]));
  const repoGroups = new Map();
  for (const a of agentList) {
    const home = bySpace.get(a.space);
    if (!home) continue;
    const repo = currentRepo(byAddress.get(rootOf(a.address))?.labels);
    if (!repo) {
      home.agents.push(a);
      continue;
    }
    const machine = machineOf.get(a.space) ?? null;
    const key = JSON.stringify([machine, repo]);
    if (!repoGroups.has(key)) repoGroups.set(key, { kind: "repo", repo, machine, agents: [] });
    repoGroups.get(key).agents.push(a);
  }
  const repos = [...repoGroups.values()].sort((x, y) =>
    (x.machine !== null) - (y.machine !== null) || byName(x.machine, y.machine) || byName(x.repo, y.repo));
  return [...spaceGroups, ...repos];
}

// The checkout of a repo on a machine (null: here), or null when it isn't cloned there.
export async function repoDir(repo, machine, exec) {
  const r = await exec("sh", ["-c", 'cd "$HOME/workspace/$1" 2>/dev/null && pwd -P', "sh", repo], { on: machine, timeout: 10_000 }).catch(() => null);
  return r?.code === 0 ? r.stdout.trim() : null;
}

// [{ repo, dir }] for each declared repo that is cloned, else [{ repo: null, dir: cwd }].
export async function sessionDirs({ labels, cwd, machine = null }, exec) {
  const repos = declaredRepos(labels);
  if (!repos.length) return cwd ? [{ repo: null, dir: cwd }] : [];
  const dirs = await Promise.all(repos.map(async (repo) => ({ repo, dir: await repoDir(repo, machine, exec) })));
  return dirs.filter((d) => d.dir);
}

// The folder a one-repo tool works in: the current repo's checkout, else cwd.
export async function currentDir({ labels, cwd, machine = null }, exec) {
  const repo = currentRepo(labels);
  return (repo && (await repoDir(repo, machine, exec))) || cwd || null;
}
