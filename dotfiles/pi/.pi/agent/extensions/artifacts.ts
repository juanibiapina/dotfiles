/**
 * Artifacts extension - persist named files that outlive a single pi session.
 *
 * An "artifact" is a file (e.g. a plan or a set of notes) that lives outside the
 * git repo and survives across sessions. Any session in the same project can
 * create, read, and update artifacts. On session start, if artifacts already
 * exist, a short listing (with absolute paths) is injected so the agent knows
 * they are available and can Read/Edit them directly.
 *
 * Storage model - the filesystem is the source of truth:
 *   <tmpdir>/pi-artifacts/<hash>/            one directory per project
 *     <slug>.<ext>                           the artifacts themselves
 *     .index.json                            optional per-file title/type
 * <hash> is a short sha256 of the project root (git top-level, falling back to
 * cwd), so sessions started in subdirectories share the same artifacts. The set
 * of artifacts is whatever non-dotfiles exist in the directory; the sidecar only
 * enriches the listing with an optional title/type and never drives it. The
 * agent edits a returned path with the normal Read/Write/Edit tools; the change
 * is reflected automatically with no manifest to keep in sync.
 *
 * Tools:
 *   artifact_save   - create or fully rewrite an artifact, returns its path
 *   artifact_list   - list artifacts with type/title, age, and path
 *   artifact_delete - remove an artifact and its sidecar entry
 *
 * Tradeoff: os.tmpdir() can be cleared on reboot, so artifacts are not
 * permanent. If longer persistence is wanted, only the base directory needs to
 * change (e.g. an XDG state dir); the rest of the design is unaffected.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { withFileMutationQueue } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

const SIDECAR = ".index.json";
const LISTING_TYPE = "pi-artifacts";
const LISTED_MARKER = "pi-artifacts-listed";

interface SidecarEntry {
	title?: string;
	type?: string;
}
type Sidecar = Record<string, SidecarEntry>;

interface ArtifactInfo {
	name: string;
	path: string;
	mtimeMs: number;
	title?: string;
	type?: string;
}

/** Short, stable directory key for a project root. */
function artifactDir(root: string): string {
	const hash = createHash("sha256").update(resolve(root)).digest("hex").slice(0, 16);
	return join(tmpdir(), "pi-artifacts", hash);
}

/**
 * Turn an arbitrary artifact name into a safe filename inside the artifact
 * directory. Drops directory components, leading dots, and disallowed
 * characters so traversal (e.g. "../escape") cannot leave the sandbox. Returns
 * null when nothing usable remains.
 */
function safeFilename(name: string): string | null {
	let base = (name ?? "").trim();
	if (!base) return null;
	base = base.split(/[\\/]/).pop() ?? "";
	base = base.replace(/^\.+/, "");
	if (!base) return null;

	const dot = base.lastIndexOf(".");
	let stem = dot > 0 ? base.slice(0, dot) : base;
	let ext = dot > 0 ? base.slice(dot + 1) : "";

	stem = stem
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^[-.]+|[-.]+$/g, "");
	if (!stem) return null;

	ext = ext.toLowerCase().replace(/[^a-z0-9]+/g, "");
	if (!ext) ext = "md";

	return `${stem}.${ext}`;
}

/**
 * Resolve an artifact name to an absolute path inside `dir`, asserting the
 * result stays within the sandbox. Throws on an unusable name or containment
 * violation.
 */
function resolveArtifactPath(dir: string, name: string): { file: string; path: string } {
	const file = safeFilename(name);
	if (!file) throw new Error(`Invalid artifact name: ${JSON.stringify(name)}`);
	const path = resolve(dir, file);
	const root = resolve(dir) + sep;
	if (!path.startsWith(root)) throw new Error(`Refusing to write outside artifact directory: ${name}`);
	return { file, path };
}

function readSidecar(dir: string): Sidecar {
	const p = join(dir, SIDECAR);
	if (!existsSync(p)) return {};
	try {
		const parsed = JSON.parse(readFileSync(p, "utf8"));
		return parsed && typeof parsed === "object" ? (parsed as Sidecar) : {};
	} catch {
		return {};
	}
}

function writeSidecar(dir: string, sidecar: Sidecar): void {
	writeFileSync(join(dir, SIDECAR), `${JSON.stringify(sidecar, null, 2)}\n`, "utf8");
}

/** Enumerate artifacts (non-dotfiles), merging optional sidecar metadata. */
function listArtifacts(dir: string): ArtifactInfo[] {
	if (!existsSync(dir)) return [];
	const sidecar = readSidecar(dir);
	const out: ArtifactInfo[] = [];
	for (const name of readdirSync(dir)) {
		if (name.startsWith(".")) continue;
		const path = join(dir, name);
		let mtimeMs: number;
		try {
			const st = statSync(path);
			if (!st.isFile()) continue;
			mtimeMs = st.mtimeMs;
		} catch {
			continue;
		}
		const meta = sidecar[name] ?? {};
		out.push({ name, path, mtimeMs, title: meta.title, type: meta.type });
	}
	out.sort((a, b) => b.mtimeMs - a.mtimeMs);
	return out;
}

function formatAge(mtimeMs: number, now: number): string {
	const secs = Math.max(0, Math.floor((now - mtimeMs) / 1000));
	if (secs < 60) return "just now";
	const mins = Math.floor(secs / 60);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function describe(a: ArtifactInfo): string {
	const bits: string[] = [];
	if (a.type) bits.push(a.type);
	if (a.title) bits.push(`"${a.title}"`);
	return bits.join(" ");
}

/** Build the multi-line listing shown to the agent. */
function formatListing(artifacts: ArtifactInfo[], now: number): string {
	const lines: string[] = [];
	lines.push(
		`${artifacts.length} saved artifact${artifacts.length === 1 ? "" : "s"} for this project ` +
			`(persist across sessions, invisible to git). Read or edit them directly at their paths.`,
	);
	for (const a of artifacts) {
		const desc = describe(a);
		const head = desc ? `${a.name} — ${desc}` : a.name;
		lines.push(`- ${head} (updated ${formatAge(a.mtimeMs, now)})`);
		lines.push(`  ${a.path}`);
	}
	return lines.join("\n");
}

/** Project root: git top-level if available, otherwise cwd. */
async function projectRoot(pi: ExtensionAPI, cwd: string): Promise<string> {
	try {
		const { stdout, code } = await pi.exec("git", ["-C", cwd, "rev-parse", "--show-toplevel"]);
		const root = stdout.trim();
		if (code === 0 && root) return root;
	} catch {
		// not a git repo, or git unavailable
	}
	return cwd;
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
			const dir = artifactDir(await projectRoot(pi, ctx.cwd));
			let target: { file: string; path: string };
			try {
				target = resolveArtifactPath(dir, params.name);
			} catch (err) {
				return { ...textResult((err as Error).message), isError: true };
			}

			mkdirSync(dir, { recursive: true });
			await withFileMutationQueue(target.path, async () => {
				writeFileSync(target.path, params.content, "utf8");
			});

			if (params.title !== undefined || params.type !== undefined) {
				await withFileMutationQueue(join(dir, SIDECAR), async () => {
					const sidecar = readSidecar(dir);
					const entry: SidecarEntry = { ...sidecar[target.file] };
					if (params.title !== undefined) entry.title = params.title;
					if (params.type !== undefined) entry.type = params.type;
					sidecar[target.file] = entry;
					writeSidecar(dir, sidecar);
				});
			}

			return textResult(
				`Saved artifact "${target.file}" at:\n${target.path}\n\n` +
					`Edit this path directly with the Edit tool for incremental updates.`,
			);
		},
	});

	pi.registerTool({
		name: "artifact_list",
		label: "List artifacts",
		description:
			"List durable artifacts saved for this project (cross-session files outside the git repo), " +
			"with their type/title, last-updated age, and absolute path. Read or edit any of them at its path.",
		parameters: Type.Object({}),
		async execute(_id, _params, _signal, _onUpdate, ctx: ExtensionContext) {
			const dir = artifactDir(await projectRoot(pi, ctx.cwd));
			const artifacts = listArtifacts(dir);
			if (artifacts.length === 0) {
				return textResult("No artifacts saved for this project yet.");
			}
			return textResult(formatListing(artifacts, Date.now()));
		},
	});

	pi.registerTool({
		name: "artifact_delete",
		label: "Delete artifact",
		description: "Delete a durable artifact and its sidecar metadata for this project.",
		parameters: Type.Object({
			name: Type.String({ description: "Name of the artifact to delete (same name used to save it)." }),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx: ExtensionContext) {
			const dir = artifactDir(await projectRoot(pi, ctx.cwd));
			let target: { file: string; path: string };
			try {
				target = resolveArtifactPath(dir, params.name);
			} catch (err) {
				return { ...textResult((err as Error).message), isError: true };
			}

			if (!existsSync(target.path)) {
				return { ...textResult(`No artifact named "${target.file}" to delete.`), isError: true };
			}

			await withFileMutationQueue(target.path, async () => {
				rmSync(target.path, { force: true });
			});
			await withFileMutationQueue(join(dir, SIDECAR), async () => {
				const sidecar = readSidecar(dir);
				if (sidecar[target.file]) {
					delete sidecar[target.file];
					writeSidecar(dir, sidecar);
				}
			});

			return textResult(`Deleted artifact "${target.file}".`);
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		// Inject the listing once per session. A "custom" marker entry is appended
		// immediately and persists across reload/resume, so it appears in the
		// branch on subsequent session_start firings and prevents duplicates.
		// (The listing message itself is delivered "nextTurn" and is not in the
		// branch until the next prompt, so it cannot be used as the guard.)
		const branch = ctx.sessionManager.getBranch();
		const alreadyListed = branch.some(
			(e) => e.type === "custom" && (e as { customType?: string }).customType === LISTED_MARKER,
		);
		if (alreadyListed) return;

		const dir = artifactDir(await projectRoot(pi, ctx.cwd));
		const artifacts = listArtifacts(dir);
		if (artifacts.length === 0) return;

		pi.sendMessage(
			{ customType: LISTING_TYPE, content: formatListing(artifacts, Date.now()), display: true },
			{ deliverAs: "nextTurn" },
		);
		pi.appendEntry(LISTED_MARKER);
	});
}
