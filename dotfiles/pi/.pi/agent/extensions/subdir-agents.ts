import { isReadToolResult, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFile, realpath, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const LOADED_ENTRY_TYPE = "subdir-agents-loaded";
const AGENTS_FILE = "AGENTS.md";

async function canonicalPath(path: string): Promise<string> {
	try {
		return await realpath(path);
	} catch {
		return resolve(path);
	}
}

function isInside(parent: string, child: string): boolean {
	const path = relative(parent, child);
	return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

async function findAgentsFiles(cwd: string, target: string): Promise<string[]> {
	if (!isInside(cwd, target) || basename(target) === AGENTS_FILE) return [];

	const files: string[] = [];
	for (let directory = dirname(target); directory !== cwd; directory = dirname(directory)) {
		const agentsPath = join(directory, AGENTS_FILE);
		try {
			if ((await stat(agentsPath)).isFile()) files.push(agentsPath);
		} catch {
			// Missing, unreadable, and non-file instruction paths do not affect the Read result.
		}
	}
	return files.reverse();
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
	let cwd = resolve(process.cwd());
	let loaded = new Set<string>();
	const loading = new Set<string>();

	pi.on("session_start", async (_event, ctx) => {
		cwd = await canonicalPath(ctx.cwd);
		loaded = restoredPaths(ctx.sessionManager.getEntries());
		loading.clear();
	});

	pi.on("tool_result", async (event, ctx) => {
		if (!isReadToolResult(event) || event.isError || typeof event.input.path !== "string") return;

		const target = await canonicalPath(resolve(cwd, event.input.path));
		const agentsFiles = await findAgentsFiles(cwd, target);
		const content = [...event.content];

		for (const agentsPath of agentsFiles) {
			if (loaded.has(agentsPath) || loading.has(agentsPath)) continue;
			loading.add(agentsPath);

			try {
				const instructions = await readFile(agentsPath, "utf8");
				loaded.add(agentsPath);
				try {
					pi.appendEntry(LOADED_ENTRY_TYPE, agentsPath);
				} catch {
					// The current extension instance remains deduplicated if persistence fails.
				}
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
