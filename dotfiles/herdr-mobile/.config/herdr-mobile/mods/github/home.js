// The home space on the definition machine, where new sessions start, as
// desktop's ctrl-space i does on the Mac (mods/home): a space named "home" in
// ~/workspace/juanibiapina/home, cloned there when missing. A session started
// for a repo carries the `repos` label pi's work_on_repo tool sets (repos.js),
// so the Spaces list groups it under that repo; the repo is cloned first,
// since work_on_repo and the desktop workbench look for it in ~/workspace.
// The classic mod links this file.

import { spaces, machines, exec, run } from "herdr";

const HOME_REPO = "juanibiapina/home";

export const homeMachine = () => machines().find((m) => m.definition)?.name ?? null;
export const isHome = (s) => s.machine === homeMachine() && (s.folder ?? "").replace(/\/+$/, "").endsWith(`/workspace/${HOME_REPO}`);
export const homeSpace = () => spaces().find(isHome) ?? null;

// ~/workspace/<owner>/<name> on the machine, cloned with gh when missing.
export async function ensureClone(repo, machine) {
  const r = await exec("sh", ["-c", 'd="$HOME/workspace/$1"; [ -d "$d" ] || gh repo clone "$1" "$d" >&2 || exit 1; cd "$d" && pwd -P', "sh", repo], { on: machine });
  if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || `Could not clone ${repo} on ${machine}`);
  return r.stdout.trim();
}

// pi, after labelling its own terminal (`hc label`), like desktop's new-pi.
// Labels are key=value without spaces, split on whitespace by the shell.
export function piArgv(labels = [], text = null) {
  return ["sh", "-c",
    'h=$(command -v hc || echo "$HOME/.local/bin/hc"); [ -n "$1" ] && [ -n "$HC_TERMINAL_ID" ] && "$h" label "$HC_TERMINAL_ID" $1 >/dev/null 2>&1; shift; exec "$@"',
    "sh", labels.filter(Boolean).join(" "), "pi", ...(text ? [text] : [])];
}

// Starts pi in home, opening the space first when it isn't open, and shows it.
// repo: the repo the session works on; labels: more key=value; text: its first message.
export async function startInHome({ repo = null, labels = [], text = null, name = "pi" } = {}) {
  const machine = homeMachine();
  if (!machine) throw new Error("No definition machine");
  if (repo) await ensureClone(repo, machine);
  const argv = piArgv([repo ? `repos=${repo}` : null, ...labels], text);
  const open = homeSpace();
  const r = open
    ? await run("tab.new", { space: open.id, name, argv })
    : await run("space.new", { machine, name: "home", folder: await ensureClone(HOME_REPO, machine), argv });
  await run("terminal.show", { terminal: r.terminal });
  return r.terminal;
}
