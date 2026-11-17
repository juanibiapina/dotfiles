// The repos a session works on, from the `repos` label that pi's work_on_repo
// tool sets on its terminal: "owner/name,owner/name" in the order it declared
// them. The last one is the session's current repo. A repo's checkout is
// $HOME/workspace/<owner>/<name> on the session's machine. Sessions without
// the label are about their folder (cwd). scripts/link-dotfiles.bash copies
// this file into the mods that use it; the phone's github mod links it.

export function declaredRepos(labels) {
  return String(labels?.repos ?? "").split(",").map((r) => r.trim()).filter(Boolean);
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
  if (own.repos) return own;
  const pi = agentList.find((a) => a.tab === focus.tab && a.app === "pi");
  return pi ? labelsOf(pi.address) : own;
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
