/**
 * Skills extension - load a skill from a GitHub directory URL
 *
 * Tool: load_skill_from_url
 *   Downloads a skill directory from a public GitHub URL into a local temp
 *   directory and returns the absolute path. The agent can then Read SKILL.md
 *   (and any sibling files like scripts/, references/, assets/) normally.
 *
 * Supported URL forms (public repos only):
 *   https://github.com/<owner>/<repo>
 *   https://github.com/<owner>/<repo>/tree/<ref>
 *   https://github.com/<owner>/<repo>/tree/<ref>/<path>
 *   https://github.com/<owner>/<repo>/blob/<ref>/<path>/SKILL.md
 *
 * The ref must be a single path segment (e.g. "main", not "release/v1").
 *
 * Results are cached in $TMPDIR/pi-skills/<hash>/. Pass force: true to
 * bypass the cache.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface ParsedUrl {
	owner: string;
	repo: string;
	ref?: string;
	subpath: string;
}

function parseGithubUrl(input: string): ParsedUrl | { error: string } {
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		return { error: `Invalid URL: ${input}` };
	}

	if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
		return { error: `Only github.com URLs are supported (got ${url.hostname})` };
	}

	const segments = url.pathname.split("/").filter(Boolean);
	if (segments.length < 2) {
		return { error: "URL must include owner and repo" };
	}

	const owner = segments[0];
	let repo = segments[1];
	if (repo.endsWith(".git")) repo = repo.slice(0, -4);

	if (segments.length === 2) {
		return { owner, repo, subpath: "" };
	}

	const kind = segments[2];
	if (kind !== "tree" && kind !== "blob") {
		return { error: `Unsupported URL form: expected /tree/ or /blob/ after repo (got /${kind}/)` };
	}

	if (segments.length < 4) {
		return { error: `URL missing ref after /${kind}/` };
	}

	const ref = segments[3];
	let pathSegments = segments.slice(4);

	if (kind === "blob" && pathSegments[pathSegments.length - 1]?.toLowerCase() === "skill.md") {
		pathSegments = pathSegments.slice(0, -1);
	}

	return { owner, repo, ref, subpath: pathSegments.join("/") };
}

async function getDefaultBranch(
	pi: ExtensionAPI,
	owner: string,
	repo: string,
): Promise<{ branch: string } | { error: string }> {
	const { stdout, code, stderr } = await pi.exec("curl", [
		"-fsSL",
		"-H",
		"Accept: application/vnd.github+json",
		`https://api.github.com/repos/${owner}/${repo}`,
	]);
	if (code !== 0) {
		return { error: `Failed to fetch default branch for ${owner}/${repo}: ${stderr.trim() || `curl exited ${code}`}` };
	}
	try {
		const data = JSON.parse(stdout) as { default_branch?: string };
		if (!data.default_branch) {
			return { error: `GitHub response for ${owner}/${repo} missing default_branch` };
		}
		return { branch: data.default_branch };
	} catch (err) {
		return { error: `Failed to parse GitHub response: ${(err as Error).message}` };
	}
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "load_skill_from_url",
		label: "Load skill",
		description:
			"Fetch a skill from GitHub so it can be used in the current task. " +
			"Use whenever the user points at a GitHub URL for a skill, or asks to try/apply/install a skill from a link. " +
			"Returns a local path containing SKILL.md and any supporting files (scripts/, references/, assets/); " +
			"read SKILL.md from that path and follow it as you would any other skill. " +
			"Accepts public github.com URLs in any of these shapes: " +
			"https://github.com/<owner>/<repo>, " +
			"https://github.com/<owner>/<repo>/tree/<ref>[/<path>], or " +
			"https://github.com/<owner>/<repo>/blob/<ref>/<path>/SKILL.md.",
		parameters: Type.Object({
			url: Type.String({ description: "GitHub URL of the skill directory or repo." }),
			force: Type.Optional(
				Type.Boolean({ description: "Re-download even if cached. Defaults to false." }),
			),
		}),
		async execute(_toolCallId, params) {
			const parsed = parseGithubUrl(params.url);
			if ("error" in parsed) {
				return { content: [{ type: "text", text: parsed.error }], isError: true } as any;
			}

			let { ref } = parsed;
			const { owner, repo, subpath } = parsed;
			if (!ref) {
				const result = await getDefaultBranch(pi, owner, repo);
				if ("error" in result) {
					return { content: [{ type: "text", text: result.error }], isError: true } as any;
				}
				ref = result.branch;
			}

			const cacheKey = createHash("sha256")
				.update(`${owner}/${repo}@${ref}/${subpath}`)
				.digest("hex")
				.slice(0, 16);
			const cacheRoot = join(tmpdir(), "pi-skills", cacheKey);
			const skillDir = join(cacheRoot, "skill");
			const skillMd = join(skillDir, "SKILL.md");

			const force = params.force === true;
			if (force && existsSync(cacheRoot)) {
				rmSync(cacheRoot, { recursive: true, force: true });
			}

			if (!existsSync(skillMd)) {
				if (existsSync(cacheRoot)) rmSync(cacheRoot, { recursive: true, force: true });
				mkdirSync(cacheRoot, { recursive: true });

				const tarball = join(cacheRoot, "source.tar.gz");
				const tarballUrl = `https://codeload.github.com/${owner}/${repo}/tar.gz/${ref}`;
				const dl = await pi.exec("curl", ["-fsSL", "-o", tarball, tarballUrl]);
				if (dl.code !== 0) {
					rmSync(cacheRoot, { recursive: true, force: true });
					return {
						content: [{
							type: "text",
							text: `Failed to download tarball from ${tarballUrl}: ${dl.stderr.trim() || `curl exited ${dl.code}`}`,
						}],
						isError: true,
					} as any;
				}

				const extractRoot = join(cacheRoot, "extract");
				mkdirSync(extractRoot, { recursive: true });
				const extract = await pi.exec("tar", [
					"-xzf",
					tarball,
					"-C",
					extractRoot,
					"--strip-components=1",
				]);
				if (extract.code !== 0) {
					rmSync(cacheRoot, { recursive: true, force: true });
					return {
						content: [{
							type: "text",
							text: `Failed to extract tarball: ${extract.stderr.trim() || `tar exited ${extract.code}`}`,
						}],
						isError: true,
					} as any;
				}

				const sourceDir = subpath ? join(extractRoot, subpath) : extractRoot;
				if (!existsSync(sourceDir)) {
					rmSync(cacheRoot, { recursive: true, force: true });
					return {
						content: [{
							type: "text",
							text: `Path '${subpath}' not found in ${owner}/${repo}@${ref}`,
						}],
						isError: true,
					} as any;
				}

				try {
					renameSync(sourceDir, skillDir);
				} catch {
					// rename across boundaries can fail; fall back to copy
					cpSync(sourceDir, skillDir, { recursive: true });
				}

				try { rmSync(extractRoot, { recursive: true, force: true }); } catch { /* noop */ }
				try { rmSync(tarball, { force: true }); } catch { /* noop */ }

				if (!existsSync(skillMd)) {
					const entries = readdirSync(skillDir).slice(0, 20).join(", ");
					return {
						content: [{
							type: "text",
							text: `Loaded ${owner}/${repo}@${ref}${subpath ? `/${subpath}` : ""} but no SKILL.md found. Directory contents: ${entries}`,
						}],
						isError: true,
					} as any;
				}
			}

			return {
				content: [{
					type: "text",
					text:
						`Skill loaded at ${skillDir}\n` +
						`SKILL.md: ${skillMd}\n` +
						`Source: ${owner}/${repo}@${ref}${subpath ? `/${subpath}` : ""}\n` +
						`Read SKILL.md to use the skill.`,
				}],
			};
		},
	});
}
