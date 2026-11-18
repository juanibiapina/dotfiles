import {
	isEditToolResult,
	isFindToolResult,
	isGrepToolResult,
	isLsToolResult,
	isReadToolResult,
	isWriteToolResult,
	type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

// The terminal's labels: `repos` lists the repos the session wrote to,
// `related` the repos it only read, each in first-touch order. Herdr's
// mods/inbox/repos.js reads them.
const REPOS = "repos";
const RELATED = "related";
const REPO_NAME = /^[\w.-]+\/[\w.-]+$/;

type Kind = "write" | "read";
type Labelled = { [REPOS]: string[]; [RELATED]: string[] };

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

const inside = (dir: string, path: string) => {
	const rel = relative(dir, path);
	return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
};

// owner/name when path lies inside workspace/<owner>/<name>, else null.
function repoUnder(workspace: string, path: string): string | null {
	if (!inside(workspace, path)) return null;
	const [owner, name] = relative(workspace, path).split(sep);
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

	// Adds repo to the label of its kind, unless a write already holds it.
	function touch(terminal: string, kind: Kind, repo: string): Promise<void> {
		const key = kind === "write" ? REPOS : RELATED;
		const run = queue.then(async () => {
			if (known && has(known, kind, repo)) return;
			const current = await readLabels(terminal);
			if (!has(current, kind, repo)) {
				const next = [...current[key], repo];
				await hc(["label", terminal, `${key}=${next.join(",")}`]);
				current[key] = next;
			}
			known = current;
		});
		queue = run.catch(() => {});
		return run;
	}

	// The real folders of the skills pi discovered, recomputed when the list changes.
	let skillKey = "";
	let skillDirs: string[] = [];
	const skillFolders = async () => {
		const files = pi
			.getCommands()
			.filter((c) => c.source === "skill")
			.map((c) => c.sourceInfo.path);
		const key = files.join("\n");
		if (key !== skillKey) {
			skillDirs = await Promise.all(files.map((f) => canonicalPath(dirname(f))));
			skillKey = key;
		}
		return skillDirs;
	};

	// Label the repos the session's files lie in, following symlinks. Reading a
	// skill is using it, so reads inside a skill pi discovered don't count;
	// writing one is working on its repo.
	pi.on("tool_result", async (event, ctx) => {
		const terminal = process.env.HC_TERMINAL_ID;
		if (event.isError || !terminal) return;
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
			const target = await canonicalPath(resolveToolPath(path, ctx.cwd));
			const repo = repoUnder(await canonicalPath(workspaceDir()), target);
			if (!repo) return;
			if (kind === "read" && (await skillFolders()).some((dir) => inside(dir, target))) return;
			await touch(terminal, kind, repo);
		} catch {
			// Labels never affect the tool's result.
		}
	});
}
