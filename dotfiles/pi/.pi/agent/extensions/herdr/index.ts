import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const REPOS = "repos";
const REPO_NAME = /^[\w.-]+\/[\w.-]+$/;

async function isDirectory(path: string): Promise<boolean> {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}

export default function (pi: ExtensionAPI) {
	const hc = async (args: string[], signal?: AbortSignal) => {
		const r = await pi.exec("hc", args, { signal, timeout: 10_000 });
		if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || `hc ${args[0]} failed`);
		return r.stdout;
	};

	pi.registerTool(
		defineTool({
			name: "work_on_repo",
			label: "Work on repo",
			description:
				"Declare that this session is about to change a repository, so Herdr shows its branches, PRs and jobs for this session. " +
				"Call it once per repository, before the first edit, commit or job there. Skip it for repositories you only read.",
			parameters: Type.Object({
				repo: Type.String({ description: "The repository as owner/name, e.g. gitbutlerapp/gitbutler" }),
			}),
			executionMode: "sequential",

			async execute(_toolCallId, params, signal) {
				const terminal = process.env.HC_TERMINAL_ID;
				if (!terminal) throw new Error("Not running in Herdr: there is no HC_TERMINAL_ID to label.");
				const repo = params.repo.trim();
				if (!REPO_NAME.test(repo)) throw new Error(`Expected owner/name, got "${params.repo}".`);
				const workspace = process.env.WORKSPACE || join(homedir(), "workspace");
				if (!(await isDirectory(join(workspace, repo)))) {
					throw new Error(`${repo} is not cloned at ${join(workspace, repo)}. Clone it with the workspace skill first.`);
				}

				const labels = JSON.parse(await hc(["get", terminal, "--json"], signal)).labels ?? {};
				const repos: string[] = String(labels[REPOS] ?? "").split(",").map((r) => r.trim()).filter(Boolean);
				if (!repos.includes(repo)) {
					repos.push(repo);
					await hc(["label", terminal, `${REPOS}=${repos.join(",")}`], signal);
				}
				return {
					content: [{ type: "text", text: `This session works on: ${repos.join(", ")}` }],
					details: { repos },
				};
			},
		}),
	);
}
