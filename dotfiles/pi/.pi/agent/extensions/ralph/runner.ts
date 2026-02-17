/**
 * Phase runner — spawns `pi -p --session <path>` sub-processes.
 *
 * Used by both L1 (to spawn L2 iteration sessions) and L2 (to spawn L3 phase sessions).
 * Captures stdout text, handles abort via SIGTERM, cleans up temp files.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface PhaseOptions {
	/** Absolute path to the session file */
	sessionFile: string;
	/** Working directory for the pi process */
	cwd: string;
	/** User message to send to the session */
	message: string;
	/** System prompt to append (written to temp file, passed via --append-system-prompt) */
	systemPrompt?: string;
	/** Path to an extension to load (via -e) */
	extension?: string;
	/** Paths to skill files to load (via --skill, can be multiple) */
	skills?: string[];
	/** Disable extension auto-discovery (default: true) */
	noExtensions?: boolean;
	/** Disable skill auto-discovery (default: true) */
	noSkills?: boolean;
	/** Disable prompt template auto-discovery (default: true) */
	noPromptTemplates?: boolean;
	/** Abort signal — sends SIGTERM to the child process */
	signal?: AbortSignal;
}

export interface PhaseResult {
	/** Captured stdout text from the pi session */
	output: string;
	/** Process exit code */
	exitCode: number;
	/** The session file path (same as input) */
	sessionFile: string;
}

function writeTempFile(label: string, content: string): { dir: string; filePath: string } {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ralph-"));
	const safeName = label.replace(/[^\w.-]+/g, "_");
	const filePath = path.join(tmpDir, `${safeName}.md`);
	fs.writeFileSync(filePath, content, { encoding: "utf-8", mode: 0o600 });
	return { dir: tmpDir, filePath };
}

export async function runPhase(options: PhaseOptions): Promise<PhaseResult> {
	const {
		sessionFile,
		cwd,
		message,
		systemPrompt,
		extension,
		skills,
		noExtensions = true,
		noSkills = true,
		noPromptTemplates = true,
		signal,
	} = options;

	// Ensure session directory exists
	fs.mkdirSync(path.dirname(sessionFile), { recursive: true });

	// Build pi args
	const args: string[] = ["-p", "--session", sessionFile];

	if (noExtensions) args.push("--no-extensions");
	if (noSkills) args.push("--no-skills");
	if (noPromptTemplates) args.push("--no-prompt-templates");

	if (extension) args.push("--extension", extension);

	if (skills) {
		for (const skill of skills) {
			args.push("--skill", skill);
		}
	}

	// Write system prompt to temp file if provided
	let tmpDir: string | null = null;
	let tmpFile: string | null = null;

	if (systemPrompt) {
		const tmp = writeTempFile("system-prompt", systemPrompt);
		tmpDir = tmp.dir;
		tmpFile = tmp.filePath;
		args.push("--append-system-prompt", tmpFile);
	}

	// Add the user message as a positional argument
	args.push(message);

	let output = "";
	let wasAborted = false;

	try {
		const exitCode = await new Promise<number>((resolve) => {
			const proc = spawn("pi", args, {
				cwd,
				shell: false,
				stdio: ["ignore", "pipe", "pipe"],
			});

			proc.stdout.on("data", (data: Buffer) => {
				output += data.toString();
			});

			// Ignore stderr (pi diagnostic output)
			proc.stderr.on("data", () => {});

			proc.on("close", (code) => {
				resolve(code ?? 1);
			});

			proc.on("error", () => {
				resolve(1);
			});

			if (signal) {
				const killProc = () => {
					wasAborted = true;
					proc.kill("SIGTERM");
					setTimeout(() => {
						if (!proc.killed) proc.kill("SIGKILL");
					}, 5000);
				};

				if (signal.aborted) {
					killProc();
				} else {
					signal.addEventListener("abort", killProc, { once: true });
				}
			}
		});

		if (wasAborted) {
			return { output: "Phase aborted.", exitCode: 1, sessionFile };
		}

		return { output: output.trim(), exitCode, sessionFile };
	} finally {
		if (tmpFile) {
			try {
				fs.unlinkSync(tmpFile);
			} catch {
				/* ignore */
			}
		}
		if (tmpDir) {
			try {
				fs.rmdirSync(tmpDir);
			} catch {
				/* ignore */
			}
		}
	}
}
