/**
 * Pi tools and session-start injection for durable artifacts.
 *
 * `dev artifacts` owns artifact storage, naming, metadata, listing, and deletion.
 * This extension translates tool calls to that CLI, formats its records for the
 * agent, uses pi's per-file mutation queue, and transports save content through
 * a short-lived temp file because pi.exec has no stdin.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { withFileMutationQueue } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const LISTING_TYPE = "pi-artifacts";
const LISTED_MARKER = "pi-artifacts-listed";

interface ArtifactInfo {
	name: string;
	path: string;
	title?: string;
	type?: string;
	age: string;
}

async function cliPath(pi: ExtensionAPI, args: string[], action: string): Promise<string> {
	let stdout = "";
	let stderr = "";
	let code: number | undefined;
	try {
		({ stdout, stderr, code } = await pi.exec("dev", ["artifacts", ...args]));
	} catch (err) {
		throw new Error(`Could not ${action}: ${(err as Error).message}`);
	}
	const path = stdout.trimEnd();
	if (code === 0 && path.startsWith("/") && !path.includes("\n")) return path;
	const detail = stderr.trim() || `\`dev artifacts\` exited ${code ?? "?"} with no valid output (is \`dev\` on PATH?)`;
	throw new Error(`Could not ${action}: ${detail}`);
}

async function artifactPath(pi: ExtensionAPI, name: string, cwd: string): Promise<string> {
	return cliPath(pi, ["path", "--", name, cwd], "resolve the artifact path");
}

async function listArtifacts(pi: ExtensionAPI, cwd: string): Promise<ArtifactInfo[]> {
	let stdout = "";
	let stderr = "";
	let code: number | undefined;
	try {
		({ stdout, stderr, code } = await pi.exec("dev", ["artifacts", "list", "--format=json", "--", cwd]));
	} catch (err) {
		throw new Error(`Could not list artifacts: ${(err as Error).message}`);
	}
	try {
		if (code !== 0) throw new Error(stderr.trim() || `\`dev artifacts list\` exited ${code ?? "?"}`);
		const records: unknown = JSON.parse(stdout);
		if (!Array.isArray(records) || !records.every((record) => {
			if (!record || typeof record !== "object") return false;
			const value = record as Record<string, unknown>;
			return typeof value.name === "string" && typeof value.path === "string" &&
				typeof value.age === "string" && (value.title == null || typeof value.title === "string") &&
				(value.type == null || typeof value.type === "string");
		})) throw new Error("invalid JSON records");
		return records.map((record) => {
			const value = record as Record<string, unknown>;
			return {
				name: value.name as string,
				path: value.path as string,
				age: value.age as string,
				title: value.title as string | undefined,
				type: value.type as string | undefined,
			};
		});
	} catch (err) {
		const detail = stderr.trim() || (err as Error).message;
		throw new Error(`Could not list artifacts: ${detail}`);
	}
}

function describe(a: ArtifactInfo): string {
	const bits: string[] = [];
	if (a.type) bits.push(a.type);
	if (a.title) bits.push(`"${a.title}"`);
	return bits.join(" ");
}

function formatListing(artifacts: ArtifactInfo[]): string {
	const lines: string[] = [];
	lines.push(
		`${artifacts.length} saved artifact${artifacts.length === 1 ? "" : "s"} for this project ` +
			`(persist across sessions, invisible to git). Read or edit them directly at their paths.`,
	);
	for (const a of artifacts) {
		const desc = describe(a);
		const head = desc ? `${a.name} — ${desc}` : a.name;
		lines.push(`- ${head} (updated ${a.age})`);
		lines.push(`  ${a.path}`);
	}
	return lines.join("\n");
}

function textResult(text: string) {
	return { content: [{ type: "text", text }] } as any;
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "artifact_save",
		label: "Save artifact",
		description:
			"Create or fully rewrite a durable, cross-session artifact (e.g. a plan or notes) that lives " +
			"outside the git repo and survives across pi sessions. Returns the absolute path. Use this for " +
			"the initial creation or a full rewrite; for incremental changes afterward, edit the returned " +
			"path directly with the Edit tool instead of re-saving the whole file.",
		promptSnippet:
			"artifact_save(name, content, title?, type?): persist a durable cross-session file (plan/notes), returns its path.",
		promptGuidelines: [
			"When you produce a durable plan or notes that should outlive this session, save it with artifact_save.",
			"To update an existing artifact, edit its returned path directly with Edit rather than rewriting via artifact_save.",
			"Use artifact_list to discover existing artifacts and their paths.",
		],
		parameters: Type.Object({
			name: Type.String({ description: "Artifact name, e.g. \"plan\". Slugified into a filename; defaults to a .md extension." }),
			content: Type.String({ description: "Full file content to write." }),
			title: Type.Optional(Type.String({ description: "Optional human-readable title shown in listings." })),
			type: Type.Optional(Type.String({ description: "Optional short type/category, e.g. \"plan\" or \"notes\"." })),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx: ExtensionContext) {
			let tempDir: string | undefined;
			try {
				const target = await artifactPath(pi, params.name, ctx.cwd);
				tempDir = mkdtempSync(join(tmpdir(), "pi-artifacts-"));
				const contentFile = join(tempDir, "content");
				writeFileSync(contentFile, params.content, "utf8");
				const options = ["save", `--content-file=${contentFile}`];
				if (params.title !== undefined) options.push(`--title=${params.title}`);
				if (params.type !== undefined) options.push(`--type=${params.type}`);
				await withFileMutationQueue(target, () => cliPath(pi, [...options, "--", params.name, ctx.cwd], "save the artifact"));
				return textResult(`Saved artifact "${target.split("/").pop()}" at:\n${target}\n\nEdit this path directly with the Edit tool for incremental updates.`);
			} catch (err) {
				return { ...textResult((err as Error).message), isError: true };
			} finally {
				if (tempDir) rmSync(tempDir, { recursive: true, force: true });
			}
		},
	});

	pi.registerTool({
		name: "artifact_list",
		label: "List artifacts",
		description: "List durable artifacts saved for this project (cross-session files outside the git repo), with their type/title, last-updated age, and absolute path. Read or edit any of them at its path.",
		parameters: Type.Object({}),
		async execute(_id, _params, _signal, _onUpdate, ctx: ExtensionContext) {
			try {
				const artifacts = await listArtifacts(pi, ctx.cwd);
				return artifacts.length === 0 ? textResult("No artifacts saved for this project yet.") : textResult(formatListing(artifacts));
			} catch (err) {
				return { ...textResult((err as Error).message), isError: true };
			}
		},
	});

	pi.registerTool({
		name: "artifact_delete",
		label: "Delete artifact",
		description: "Delete a durable artifact and its sidecar metadata for this project.",
		parameters: Type.Object({ name: Type.String({ description: "Name of the artifact to delete (same name used to save it)." }) }),
		async execute(_id, params, _signal, _onUpdate, ctx: ExtensionContext) {
			try {
				const target = await artifactPath(pi, params.name, ctx.cwd);
				await withFileMutationQueue(target, () => cliPath(pi, ["delete", "--", params.name, ctx.cwd], "delete the artifact"));
				return textResult(`Deleted artifact "${target.split("/").pop()}".`);
			} catch (err) {
				return { ...textResult((err as Error).message), isError: true };
			}
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		const branch = ctx.sessionManager.getBranch();
		const alreadyListed = branch.some((e) => e.type === "custom" && (e as { customType?: string }).customType === LISTED_MARKER);
		if (alreadyListed) return;
		let artifacts: ArtifactInfo[];
		try {
			artifacts = await listArtifacts(pi, ctx.cwd);
		} catch {
			return;
		}
		if (artifacts.length === 0) return;
		pi.sendMessage({ customType: LISTING_TYPE, content: formatListing(artifacts), display: true }, { deliverAs: "nextTurn" });
		pi.appendEntry(LISTED_MARKER);
	});
}
