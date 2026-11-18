// The home space, where new sessions start, as desktop's ctrl-space i does on
// the Mac (mods/home): a space named "home" in ~/workspace/juanibiapina/home,
// cloned there when missing. Each machine has its own; the definition
// machine's is the default. A session started
// for a repo carries the `repos` label pi's herdr extension sets (repos.js),
// so the Spaces list groups it under that repo; the repo is cloned first,
// since the desktop workbench looks for it in ~/workspace.
// The classic mod links this file.

import { spaces, machines, exec, run } from "herdr";

const HOME_REPO = "juanibiapina/home";

export const homeMachine = () => machines().find((m) => m.definition)?.name ?? null;
export const isHome = (s) => (s.folder ?? "").replace(/\/+$/, "").endsWith(`/workspace/${HOME_REPO}`);
export const homeSpace = (machine = homeMachine()) => spaces().find((s) => s.machine === machine && isHome(s)) ?? null;

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

// Starts pi in home on the machine, opening the space first when it isn't open, and shows it.
// repo: the repo the session works on; labels: more key=value; text: its first message.
export async function startInHome({ machine = homeMachine(), repo = null, labels = [], text = null, name = "pi" } = {}) {
  if (!machine) throw new Error("No definition machine");
  if (repo) await ensureClone(repo, machine);
  const argv = piArgv([repo ? `repos=${repo}` : null, ...labels], text);
  const open = homeSpace(machine);
  const r = open
    ? await run("tab.new", { space: open.id, name, argv })
    : await run("space.new", { machine, name: "home", folder: await ensureClone(HOME_REPO, machine), argv });
  await run("terminal.show", { terminal: r.terminal });
  return r.terminal;
}
