/**
 * Edit extension - override pi's edit tool with the external `edit` CLI
 *
 * Requirements:
 *   - `edit` must be installed and available on PATH
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createEditToolDefinition, withFileMutationQueue } from "@mariozechner/pi-coding-agent";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";

interface ExternalEditPayload {
	summary: string;
	path: string;
	edits: Array<{
		oldText: string;
		newText: string;
	}>;
}

interface ExternalEditSuccess {
	ok?: boolean;
	path?: string;
	replacedBlocks?: number;
	diff?: string;
	firstChangedLine?: number;
	message?: string;
}

function resolveToolPath(cwd: string, filePath: string): string {
	const normalized = filePath.startsWith("@") ? filePath.slice(1) : filePath;
	if (normalized === "~") return homedir();
	if (normalized.startsWith("~/")) return `${homedir()}${normalized.slice(1)}`;
	return isAbsolute(normalized) ? normalized : resolve(cwd, normalized);
}

function buildSummary(path: string, edits: ExternalEditPayload["edits"]): string {
	const blockLabel = edits.length === 1 ? "1 block" : `${edits.length} blocks`;
	return `Edit ${path} (${blockLabel})`;
}

function tryParseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

function extractErrorMessage(value: unknown): string | undefined {
	if (!value || typeof value !== "object") return undefined;

	const record = value as Record<string, unknown>;
	const direct = [record.message, record.error, record.details]
		.find((item) => typeof item === "string");
	if (typeof direct === "string" && direct.trim()) return direct.trim();

	const errors = record.errors;
	if (Array.isArray(errors)) {
		const parts = errors.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
		if (parts.length > 0) return parts.join("\n");
	}

	return undefined;
}

function formatCliFailure(stderr: string, stdout: string, exitCode: number | null): string {
	const trimmedStderr = stderr.trim();
	const trimmedStdout = stdout.trim();

	if (trimmedStderr) {
		const parsed = tryParseJson(trimmedStderr);
		const parsedMessage = extractErrorMessage(parsed);
		if (parsedMessage) {
			return exitCode === null ? parsedMessage : `${parsedMessage} (exit ${exitCode})`;
		}
	}

	const parts: string[] = [];
	if (exitCode !== null) parts.push(`edit failed with exit ${exitCode}`);
	if (trimmedStderr) parts.push(trimmedStderr);
	if (trimmedStdout) parts.push(trimmedStdout);
	return parts.join("\n\n") || "edit failed";
}

async function runExternalEdit(
	payload: ExternalEditPayload,
	signal?: AbortSignal,
): Promise<ExternalEditSuccess | undefined> {
	return new Promise<ExternalEditSuccess | undefined>((resolvePromise, rejectPromise) => {
		const child: ChildProcessWithoutNullStreams = spawn("edit", [], {
			stdio: ["pipe", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";
		let settled = false;

		const cleanup = () => {
			if (signal) signal.removeEventListener("abort", onAbort);
		};

		const finish = (fn: () => void) => {
			if (settled) return;
			settled = true;
			cleanup();
			fn();
		};

		const onAbort = () => {
			child.kill("SIGTERM");
			finish(() => rejectPromise(new Error("Operation aborted")));
		};

		if (signal?.aborted) {
			onAbort();
			return;
		}

		signal?.addEventListener("abort", onAbort, { once: true });

		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk: string) => {
			stderr += chunk;
		});
		child.on("error", (error) => {
			finish(() => rejectPromise(error));
		});
		child.on("close", (code) => {
			if (code !== 0) {
				finish(() => rejectPromise(new Error(formatCliFailure(stderr, stdout, code))));
				return;
			}

			const trimmedStdout = stdout.trim();
			const parsed = trimmedStdout ? (tryParseJson(trimmedStdout) as ExternalEditSuccess | undefined) : undefined;
			finish(() => resolvePromise(parsed));
		});

		child.stdin.write(JSON.stringify(payload));
		child.stdin.end();
	});
}

export default function (pi: ExtensionAPI) {
	const builtinEdit = createEditToolDefinition(process.cwd());

	pi.registerTool({
		...builtinEdit,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const resolvedPath = resolveToolPath(ctx.cwd, params.path);
			const payload: ExternalEditPayload = {
				summary: buildSummary(params.path, params.edits),
				path: resolvedPath,
				edits: params.edits,
			};

			return withFileMutationQueue(resolvedPath, async () => {
				const result = await runExternalEdit(payload, signal);
				const resultPath = result?.path || params.path;
				const replacedBlocks = typeof result?.replacedBlocks === "number" ? result.replacedBlocks : params.edits.length;
				const message = result?.message?.trim() || `Edited ${resultPath}. Replaced ${replacedBlocks} block(s).`;

				return {
					content: [{ type: "text", text: message }],
					details: result?.diff
						? {
							diff: result.diff,
							firstChangedLine: result.firstChangedLine,
						}
						: undefined,
				};
			});
		},
	});
}
