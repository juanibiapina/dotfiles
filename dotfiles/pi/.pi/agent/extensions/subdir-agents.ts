import { isReadToolResult, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFile, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const LOADED_ENTRY_TYPE = "subdir-agents-loaded";
const AGENTS_FILE = "AGENTS.md";

async function canonicalPath(path: string): Promise<string> {
	try {
		return await realpath(path);
	} catch {
		return resolve(path);
	}
}

async function findAgentsFiles(target: string, skipDirectories: Set<string>): Promise<string[]> {
	const files: string[] = [];
	for (let directory = dirname(target); ; directory = dirname(directory)) {
		if (!skipDirectories.has(directory)) {
			const agentsPath = join(directory, AGENTS_FILE);
			try {
				if ((await stat(agentsPath)).isFile()) files.push(agentsPath);
			} catch {
				// Missing, unreadable, and non-file instruction paths do not affect the Read result.
			}
		}
		if (dirname(directory) === directory) break;
	}
	return files.reverse();
}

function expandHome(path: string): string {
	if (path === "~") return homedir();
	if (path.startsWith("~/")) return join(homedir(), path.slice(2));
	return path;
}

function restoredPaths(entries: unknown[]): Set<string> {
	const paths = new Set<string>();
	for (const entry of entries) {
		if (!entry || typeof entry !== "object") continue;
		const value = entry as { type?: unknown; customType?: unknown; data?: unknown };
		if (value.type === "custom" && value.customType === LOADED_ENTRY_TYPE && typeof value.data === "string") {
			paths.add(value.data);
		}
	}
	return paths;
}

export default function (pi: ExtensionAPI) {
	let loaded = new Set<string>();
	let contextDirectories = new Set<string>();
	const loading = new Set<string>();

	pi.on("session_start", async (_event, ctx) => {
		loaded = restoredPaths(ctx.sessionManager.getEntries());
		loading.clear();
	});

	pi.on("before_agent_start", async (event) => {
		const directories = await Promise.all(event.systemPromptOptions.contextFiles.map(async (file) => dirname(await canonicalPath(file.path))));
		contextDirectories = new Set(directories);
	});

	function markLoaded(path: string) {
		loaded.add(path);
		try {
			pi.appendEntry(LOADED_ENTRY_TYPE, path);
		} catch {
			// The current extension instance remains deduplicated if persistence fails.
		}
	}

	pi.on("tool_result", async (event, ctx) => {
		if (!isReadToolResult(event) || event.isError || typeof event.input.path !== "string") return;

		const target = await canonicalPath(resolve(ctx.cwd, expandHome(event.input.path)));
		if (basename(target) === AGENTS_FILE) {
			if (event.input.offset === undefined && event.input.limit === undefined && !loaded.has(target)) markLoaded(target);
			return;
		}

		const agentsFiles = await findAgentsFiles(target, contextDirectories);
		const content = [...event.content];

		for (const agentsPath of agentsFiles) {
			if (loaded.has(agentsPath) || loading.has(agentsPath)) continue;
			loading.add(agentsPath);

			try {
				const instructions = await readFile(agentsPath, "utf8");
				markLoaded(agentsPath);
				content.push({
					type: "text",
					text: `Instructions from ${agentsPath} apply to files under ${dirname(agentsPath)}:\n\n<project_instructions path="${agentsPath}">\n${instructions}\n</project_instructions>`,
				});
			} catch {
				if (ctx.mode === "tui") ctx.ui.notify(`Could not read nested instructions: ${agentsPath}`, "warning");
			} finally {
				loading.delete(agentsPath);
			}
		}

		return content.length === event.content.length ? undefined : { content };
	});
}
