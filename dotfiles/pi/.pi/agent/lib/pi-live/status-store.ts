import { randomBytes } from "node:crypto";
import { unlinkSync } from "node:fs";
import {
	chmod,
	mkdir,
	readFile,
	rename,
	unlink,
	writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";

export const STATUS_SCHEMA_VERSION = 1;

export type PiSessionState = "idle" | "working";

export type TmuxLocation = {
	paneId: string;
	sessionName: string;
	windowIndex: number;
	windowName: string;
};

export type PiSessionStatus = {
	version: typeof STATUS_SCHEMA_VERSION;
	sessionId: string;
	name?: string;
	pid: number;
	cwd: string;
	sessionFile?: string;
	socketPath: string;
	startedAt: string;
	updatedAt: string;
	state: PiSessionState;
	tmux?: TmuxLocation;
};

export type StatusStore = {
	readonly statusDir: string;
	pathFor(sessionId: string): string;
	write(status: PiSessionStatus): Promise<void>;
	read(sessionId: string): Promise<PiSessionStatus | undefined>;
	remove(sessionId: string): Promise<void>;
	removeSync(sessionId: string): void;
};

export function defaultPiLiveDir(): string {
	return path.join(homedir(), ".local", "share", "pi");
}

export function createStatusStore(dataDir = defaultPiLiveDir()): StatusStore {
	const statusDir = path.join(dataDir, "status");

	return {
		statusDir,
		pathFor: (sessionId) => statusPath(statusDir, sessionId),
		async write(status) {
			if (!isPiSessionStatus(status))
				throw new Error("invalid Pi live status record");

			await mkdir(statusDir, { recursive: true, mode: 0o700 });
			await chmod(statusDir, 0o700);

			const destination = statusPath(statusDir, status.sessionId);
			const temporary = `${destination}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;

			try {
				await writeFile(temporary, `${JSON.stringify(status, null, 2)}\n`, {
					mode: 0o600,
				});
				await chmod(temporary, 0o600);
				await rename(temporary, destination);
			} catch (error) {
				await unlinkIfExists(temporary);
				throw error;
			}
		},
		async read(sessionId) {
			try {
				const value: unknown = JSON.parse(
					await readFile(statusPath(statusDir, sessionId), "utf8"),
				);
				return isPiSessionStatus(value) && value.sessionId === sessionId
					? value
					: undefined;
			} catch (error) {
				if (getErrorCode(error) === "ENOENT" || error instanceof SyntaxError)
					return undefined;
				throw error;
			}
		},
		async remove(sessionId) {
			await unlinkIfExists(statusPath(statusDir, sessionId));
		},
		removeSync(sessionId) {
			try {
				unlinkSync(statusPath(statusDir, sessionId));
			} catch (error) {
				if (getErrorCode(error) !== "ENOENT") throw error;
			}
		},
	};
}

function statusPath(statusDir: string, sessionId: string): string {
	if (!/^[A-Za-z0-9._-]+$/.test(sessionId))
		throw new Error(`invalid Pi session ID: ${sessionId}`);
	return path.join(statusDir, `${sessionId}.json`);
}

function isPiSessionStatus(value: unknown): value is PiSessionStatus {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const record = value as Record<string, unknown>;

	if (record.version !== STATUS_SCHEMA_VERSION) return false;
	if (
		typeof record.sessionId !== "string" ||
		!/^[A-Za-z0-9._-]+$/.test(record.sessionId)
	)
		return false;
	if (record.name !== undefined && typeof record.name !== "string")
		return false;
	if (
		typeof record.pid !== "number" ||
		!Number.isInteger(record.pid) ||
		record.pid <= 0
	)
		return false;
	if (typeof record.cwd !== "string" || typeof record.socketPath !== "string")
		return false;
	if (
		record.sessionFile !== undefined &&
		typeof record.sessionFile !== "string"
	)
		return false;
	if (
		typeof record.startedAt !== "string" ||
		typeof record.updatedAt !== "string"
	)
		return false;
	if (record.state !== "idle" && record.state !== "working") return false;
	if (record.tmux !== undefined && !isTmuxLocation(record.tmux)) return false;
	return true;
}

function isTmuxLocation(value: unknown): value is TmuxLocation {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.paneId === "string" &&
		typeof record.sessionName === "string" &&
		typeof record.windowIndex === "number" &&
		Number.isInteger(record.windowIndex) &&
		typeof record.windowName === "string"
	);
}

async function unlinkIfExists(filePath: string): Promise<void> {
	try {
		await unlink(filePath);
	} catch (error) {
		if (getErrorCode(error) !== "ENOENT") throw error;
	}
}

function getErrorCode(error: unknown): string | undefined {
	if (!error || typeof error !== "object") return undefined;
	const code = (error as { code?: unknown }).code;
	return typeof code === "string" ? code : undefined;
}
