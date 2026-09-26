import { loadSkillsFromDir, stripFrontmatter, type ExtensionAPI, type ExtensionContext, type Skill } from "@earendil-works/pi-coding-agent";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { recordSkill } from "./session-context.ts";

interface ParsedUrl {
	owner: string;
	repo: string;
	ref?: string;
	subpath: string;
}

function parseGithubUrl(input: string): ParsedUrl {
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		throw new Error(`Invalid GitHub skill URL: ${input}`);
	}
	if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.port) {
		throw new Error("Only public https://github.com skill URLs are supported");
	}
	const segments = url.pathname.split("/").filter(Boolean);
	if (segments.length < 2) throw new Error("Skill URL must include owner and repo");
	const [owner, rawRepo] = segments;
	const repo = rawRepo.replace(/\.git$/, "");
	if (![owner, repo].every((value) => /^[A-Za-z0-9_.-]+$/.test(value) && value !== "..")) {
		throw new Error("Invalid GitHub owner or repo");
	}
	if (segments.length === 2) return { owner, repo, subpath: "" };
	const kind = segments[2];
	if ((kind !== "tree" && kind !== "blob") || segments.length < 4) throw new Error("Expected /tree/<ref> or /blob/<ref> in skill URL");
	const ref = segments[3];
	if (!/^[A-Za-z0-9_.-]+$/.test(ref) || ref === "..") throw new Error("Invalid GitHub ref");
	let pathSegments = segments.slice(4);
	if (kind === "blob") {
		if (pathSegments.at(-1) !== "SKILL.md") throw new Error("Blob URL must point to SKILL.md");
		pathSegments = pathSegments.slice(0, -1);
	}
	if (pathSegments.some((part) => part === "." || part === "..")) throw new Error("Invalid skill path");
	return { owner, repo, ref, subpath: pathSegments.join("/") };
}

async function downloadSkill(pi: ExtensionAPI, url: string, force: boolean): Promise<string> {
	const { owner, repo, subpath, ref: suppliedRef } = parseGithubUrl(url);
	let ref = suppliedRef;
	if (!ref) {
		const result = await pi.exec("curl", ["-fsSL", "-H", "Accept: application/vnd.github+json", `https://api.github.com/repos/${owner}/${repo}`]);
		if (result.code !== 0) throw new Error(`Failed to fetch default branch: ${result.stderr.trim() || `curl exited ${result.code}`}`);
		let branch: unknown;
		try {
			branch = (JSON.parse(result.stdout) as { default_branch?: unknown }).default_branch;
		} catch {
			throw new Error("Invalid GitHub repository response");
		}
		if (typeof branch !== "string" || !/^[A-Za-z0-9_.-]+$/.test(branch) || branch === "..") throw new Error("Invalid GitHub default branch");
		ref = branch;
	}

	const cacheKey = createHash("sha256").update(`${owner}/${repo}@${ref}/${subpath}`).digest("hex").slice(0, 16);
	const cacheRoot = join(tmpdir(), "pi-skills", cacheKey);
	const skillDir = join(cacheRoot, "skill");
	if (force) rmSync(cacheRoot, { recursive: true, force: true });
	if (!existsSync(join(skillDir, "SKILL.md"))) {
		rmSync(cacheRoot, { recursive: true, force: true });
		mkdirSync(cacheRoot, { recursive: true });
		try {
			const tarball = join(cacheRoot, "source.tar.gz");
			const dl = await pi.exec("curl", ["-fsSL", "-o", tarball, `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`]);
			if (dl.code !== 0) throw new Error(`Failed to download skill: ${dl.stderr.trim() || `curl exited ${dl.code}`}`);
			const extractRoot = join(cacheRoot, "extract");
			mkdirSync(extractRoot);
			const extract = await pi.exec("tar", ["-xzf", tarball, "-C", extractRoot, "--strip-components=1"]);
			if (extract.code !== 0) throw new Error(`Failed to extract skill: ${extract.stderr.trim() || `tar exited ${extract.code}`}`);
			const sourceDir = join(extractRoot, subpath);
			if (!existsSync(join(sourceDir, "SKILL.md"))) throw new Error(`No SKILL.md found at ${owner}/${repo}@${ref}/${subpath}`);
			try {
				renameSync(sourceDir, skillDir);
			} catch {
				cpSync(sourceDir, skillDir, { recursive: true });
			}
			rmSync(extractRoot, { recursive: true, force: true });
			rmSync(tarball, { force: true });
		} catch (error) {
			rmSync(cacheRoot, { recursive: true, force: true });
			throw error;
		}
	}
	return join(skillDir, "SKILL.md");
}

function catalogFromPrompt(prompt: string): Array<{ name: string; filePath: string }> {
	const catalog: Array<{ name: string; filePath: string }> = [];
	for (const match of prompt.matchAll(/<skill>\s*<name>([^<]+)<\/name>\s*<description>[^]*?<\/description>\s*<location>([^<]+)<\/location>\s*<\/skill>/g)) {
		const decode = (value: string) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
		catalog.push({ name: decode(match[1]), filePath: decode(match[2]) });
	}
	return catalog;
}

function escapeXml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function loadSkill(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	source: string,
	force: boolean,
): Promise<string> {
	const sessionFile = ctx.sessionManager.getSessionFile();
	if (!sessionFile) throw new Error("Current Pi session has no session file");
	let filePath: string;
	if (source.startsWith("https://")) {
		filePath = await downloadSkill(pi, source, force);
	} else {
		if (force) throw new Error("force applies only to GitHub skill URLs");
		const skill = catalogFromPrompt(ctx.getSystemPrompt()).find((entry) => entry.name === source);
		if (!skill) throw new Error(`Local skill not found: ${source}`);
		filePath = skill.filePath;
	}
	const loaded = loadSkillsFromDir({ dir: dirname(filePath), source: "pi-live" }).skills.find((entry) => entry.filePath === filePath);
	if (!loaded || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(loaded.name) || loaded.name.length > 64) throw new Error(`Invalid skill: ${filePath}`);
	if (!source.startsWith("https://") && loaded.name !== source) throw new Error(`Skill name changed: ${source}`);
	const body = stripFrontmatter(readFileSync(filePath, "utf8")).trim();
	await recordSkill(sessionFile, ctx.sessionManager.getSessionId(), loaded.name);
	return `<skill name="${escapeXml(loaded.name)}" location="${escapeXml(filePath)}">\nReferences are relative to ${dirname(filePath)}.\n\n${body}\n</skill>`;
}

export function skillCatalogSection(available: Skill[]): string {
	const skills = available.filter((skill) => !skill.disableModelInvocation);
	return [
		"Use load_skill to load a local skill by name or a public GitHub skill URL when its instructions apply.",
		"Resolve relative references against the skill directory returned by the tool.",
		"<available_skills>",
		...skills.map((skill) => `  <skill>\n    <name>${escapeXml(skill.name)}</name>\n    <description>${escapeXml(skill.description)}</description>\n    <location>${escapeXml(skill.filePath)}</location>\n  </skill>`),
		"</available_skills>",
	].join("\n");
}
