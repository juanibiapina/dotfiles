import { Type } from "@earendil-works/pi-ai";
import {
	defineTool,
	isEditToolResult,
	isFindToolResult,
	isGrepToolResult,
	isLsToolResult,
	isReadToolResult,
	isWriteToolResult,
	type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, relative, resolve, sep } from "node:path";

// The terminal's labels: `repos` lists the repos the session wrote to (or
// declared with work_on_repo), `related` the repos it only read, each in
// first-touch order. Herdr's mods/inbox/repos.js reads them.
const REPOS = "repos";
const RELATED = "related";
const REPO_NAME = /^[\w.-]+\/[\w.-]+$/;

type Kind = "write" | "read";
type Labelled = { [REPOS]: string[]; [RELATED]: string[] };

async function isDirectory(path: string): Promise<boolean> {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}

async function canonicalPath(path: string): Promise<string> {
	try {
		return await realpath(path);
	} catch {
		return path;
	}
}

const workspaceDir = () => process.env.WORKSPACE || join(homedir(), "workspace");

const list = (value: unknown) =>
	String(value ?? "")
		.split(",")
		.map((r) => r.trim())
		.filter(Boolean);

// A tool's path as pi resolves it: without a leading @, ~ expanded, against cwd.
function resolveToolPath(path: string, cwd: string): string {
	let p = path.startsWith("@") ? path.slice(1) : path;
	if (p === "~") p = homedir();
	else if (p.startsWith("~/")) p = join(homedir(), p.slice(2));
	return resolve(cwd, p);
}

// owner/name when path lies inside workspace/<owner>/<name>, else null.
function repoUnder(workspace: string, path: string): string | null {
	const rel = relative(workspace, path);
	if (!rel || rel === ".." || rel.startsWith(`..${sep}`)) return null;
	const [owner, name] = rel.split(sep);
	const repo = `${owner}/${name}`;
	return owner && name && REPO_NAME.test(repo) ? repo : null;
}

export default function (pi: ExtensionAPI) {
	const hc = async (args: string[]) => {
		const r = await pi.exec("hc", args, { timeout: 10_000 });
		if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || `hc ${args[0]} failed`);
		return r.stdout;
	};

	const readLabels = async (terminal: string): Promise<Labelled> => {
		const labels = JSON.parse(await hc(["get", terminal, "--json"])).labels ?? {};
		return { [REPOS]: list(labels[REPOS]), [RELATED]: list(labels[RELATED]) };
	};

	// The labels as last seen, so only repos new to the session cost hc calls.
	let known: Labelled | null = null;
	// Label updates read, modify and write a label, so they run one at a time.
	let queue: Promise<unknown> = Promise.resolve();

	const has = (labels: Labelled, kind: Kind, repo: string) =>
		labels[REPOS].includes(repo) || (kind === "read" && labels[RELATED].includes(repo));

	// Adds repo to the label of its kind, unless a write already holds it, and
	// resolves to that label's repos.
	function touch(kind: Kind, repo: string): Promise<string[]> {
		const key = kind === "write" ? REPOS : RELATED;
		const run = queue.then(async () => {
			const terminal = process.env.HC_TERMINAL_ID;
			if (!terminal) throw new Error("Not running in Herdr: there is no HC_TERMINAL_ID to label.");
			if (known && has(known, kind, repo)) return known[key];
			const current = await readLabels(terminal);
			if (!has(current, kind, repo)) {
				const next = [...current[key], repo];
				await hc(["label", terminal, `${key}=${next.join(",")}`]);
				current[key] = next;
			}
			known = current;
			return current[key];
		});
		queue = run.catch(() => {});
		return run;
	}

	pi.registerTool(
		defineTool({
			name: "work_on_repo",
			label: "Work on repo",
			description:
				"Declare that this session changes a repository, so Herdr shows its branches, PRs and jobs for this session. " +
				"edit and write label repositories on their own; call this once per repository you change only through commands " +
				"(commits, jobs), before the first one. Skip it for repositories you only read.",
			parameters: Type.Object({
				repo: Type.String({ description: "The repository as owner/name, e.g. gitbutlerapp/gitbutler" }),
			}),
			executionMode: "sequential",

			async execute(_toolCallId, params) {
				const repo = params.repo.trim();
				if (!REPO_NAME.test(repo)) throw new Error(`Expected owner/name, got "${params.repo}".`);
				const workspace = workspaceDir();
				if (!(await isDirectory(join(workspace, repo)))) {
					throw new Error(`${repo} is not cloned at ${join(workspace, repo)}. Clone it with the workspace skill first.`);
				}
				const repos = await touch("write", repo);
				return {
					content: [{ type: "text", text: `This session works on: ${repos.join(", ")}` }],
					details: { repos },
				};
			},
		}),
	);

	// Label the repos the session's files lie in. Reads compare paths as given,
	// so files reached through Stow links (skills, config) don't count as
	// dotfiles; writes follow links to the file they change.
	pi.on("tool_result", async (event, ctx) => {
		if (event.isError || !process.env.HC_TERMINAL_ID) return;
		const kind: Kind | null =
			isEditToolResult(event) || isWriteToolResult(event)
				? "write"
				: isReadToolResult(event) || isGrepToolResult(event) || isFindToolResult(event) || isLsToolResult(event)
					? "read"
					: null;
		// grep, find and ls default to the cwd; read always has a path.
		const path = event.input.path ?? ".";
		if (!kind || typeof path !== "string") return;
		try {
			const target = resolveToolPath(path, ctx.cwd);
			const repo =
				kind === "write"
					? repoUnder(await canonicalPath(workspaceDir()), await canonicalPath(target))
					: repoUnder(workspaceDir(), target);
			if (repo) await touch(kind, repo);
		} catch {
			// Labels never affect the tool's result.
		}
	});
}
