import { randomBytes } from "node:crypto";
import { chmod, link, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { isValidSessionId } from "./status-store.ts";

export type PlanReference = { id: string; title: string; path: string };
export type SessionContext = {
	version: 1;
	sessionId: string;
	plans: PlanReference[];
	pullRequests: string[];
};

const queues = new Map<string, Promise<void>>();
const PLAN_ID_PATTERN = /^[a-f0-9]{24}$/;

export function contextPathFor(sessionFile: string, sessionId: string): string {
	if (!isValidSessionId(sessionId)) throw new Error(`invalid Pi session ID: ${sessionId}`);
	return `${path.resolve(sessionFile)}.context.json`;
}

function planDirFor(sessionFile: string): string {
	return `${path.resolve(sessionFile)}.plans`;
}

export async function ensureSessionContext(sessionFile: string, sessionId: string): Promise<string> {
	const file = contextPathFor(sessionFile, sessionId);
	try {
		await stat(file);
		await readContext(file, sessionId);
		return file;
	} catch (error) {
		if (errorCode(error) !== "ENOENT") throw error;
	}
	const context: SessionContext = { version: 1, sessionId, plans: [], pullRequests: [] };
	const temporary = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
	try {
		await writeFile(temporary, `${JSON.stringify(context, null, 2)}\n`, { mode: 0o600 });
		await link(temporary, file);
	} catch (error) {
		if (errorCode(error) !== "EEXIST") throw error;
	} finally {
		await unlink(temporary).catch(() => undefined);
	}
	await readContext(file, sessionId);
	return file;
}

export async function getSessionContext(sessionFile: string, sessionId: string): Promise<{
	contextPath: string;
	plans: PlanReference[];
	pullRequests: string[];
}> {
	const contextPath = contextPathFor(sessionFile, sessionId);
	return serialize(contextPath, async () => {
		await ensureSessionContext(sessionFile, sessionId);
		const context = await readContext(contextPath, sessionId);
		return {
			contextPath,
			plans: context.plans.map((plan) => ({ ...plan, path: path.join(path.dirname(contextPath), plan.path) })),
			pullRequests: context.pullRequests,
		};
	});
}

export async function savePlan(
	sessionFile: string,
	sessionId: string,
	title: string,
	content: string,
): Promise<PlanReference> {
	if (!title.trim() || !content.trim()) throw new Error("Plan title and content must not be blank");
	if (/[\r\n]/.test(title)) throw new Error("Plan title must be one line");
	if (Buffer.byteLength(title, "utf8") > 4096 || Buffer.byteLength(content, "utf8") > 256 * 1024)
		throw new Error("Plan title exceeds 4096 bytes or content exceeds 262144 bytes");
	const contextPath = contextPathFor(sessionFile, sessionId);
	return serialize(contextPath, async () => {
		await ensureSessionContext(sessionFile, sessionId);
		const context = await readContext(contextPath, sessionId);
		const planDir = planDirFor(sessionFile);
		await mkdir(planDir, { recursive: true, mode: 0o700 });
		await chmod(planDir, 0o700);
		let id: string;
		let file: string;
		while (true) {
			id = randomBytes(12).toString("hex");
			file = path.join(planDir, `${id}.md`);
			try {
				await writeFile(file, content, { flag: "wx", mode: 0o600 });
				break;
			} catch (error) {
				if (errorCode(error) !== "EEXIST") throw error;
			}
		}
		const plan = { id, title, path: `${path.basename(planDir)}/${id}.md` };
		try {
			await writeContext(contextPath, { ...context, plans: [...context.plans, plan] });
		} catch (error) {
			await unlink(file).catch(() => undefined);
			throw error;
		}
		return { ...plan, path: file };
	});
}

export async function deletePlan(sessionFile: string, sessionId: string, planId: string): Promise<PlanReference> {
	if (!PLAN_ID_PATTERN.test(planId)) throw new Error(`Invalid plan ID: ${planId}`);
	const contextPath = contextPathFor(sessionFile, sessionId);
	return serialize(contextPath, async () => {
		await ensureSessionContext(sessionFile, sessionId);
		const context = await readContext(contextPath, sessionId);
		const plan = context.plans.find((entry) => entry.id === planId);
		if (!plan) throw new Error(`Plan not found in this session: ${planId}`);
		const file = path.join(path.dirname(contextPath), plan.path);
		const temporary = `${file}.${randomBytes(4).toString("hex")}.deleting`;
		let moved = false;
		try {
			await rename(file, temporary);
			moved = true;
		} catch (error) {
			if (errorCode(error) !== "ENOENT") throw error;
		}
		try {
			await writeContext(contextPath, { ...context, plans: context.plans.filter((entry) => entry.id !== planId) });
		} catch (error) {
			if (moved) await rename(temporary, file);
			throw error;
		}
		if (moved) await unlink(temporary);
		return { ...plan, path: file };
	});
}

export async function savePullRequest(sessionFile: string, sessionId: string, url: string): Promise<string> {
	const pullRequest = canonicalPullRequest(url);
	const contextPath = contextPathFor(sessionFile, sessionId);
	return serialize(contextPath, async () => {
		await ensureSessionContext(sessionFile, sessionId);
		const context = await readContext(contextPath, sessionId);
		if (!context.pullRequests.includes(pullRequest)) {
			await writeContext(contextPath, { ...context, pullRequests: [...context.pullRequests, pullRequest] });
		}
		return pullRequest;
	});
}

export async function removePullRequest(sessionFile: string, sessionId: string, url: string): Promise<string> {
	const pullRequest = canonicalPullRequest(url);
	const contextPath = contextPathFor(sessionFile, sessionId);
	return serialize(contextPath, async () => {
		await ensureSessionContext(sessionFile, sessionId);
		const context = await readContext(contextPath, sessionId);
		if (!context.pullRequests.includes(pullRequest)) throw new Error(`PR not found in this session: ${pullRequest}`);
		await writeContext(contextPath, { ...context, pullRequests: context.pullRequests.filter((entry) => entry !== pullRequest) });
		return pullRequest;
	});
}

function canonicalPullRequest(value: string): string {
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		throw new Error(`Invalid GitHub PR URL: ${value}`);
	}
	if (url.origin !== "https://github.com" || url.username || url.password ||
		!/^\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/pull\/[1-9][0-9]*\/?$/.test(url.pathname)) {
		throw new Error(`Invalid GitHub PR URL: ${value}`);
	}
	return `https://github.com${url.pathname.replace(/\/$/, "")}`;
}

async function readContext(file: string, sessionId: string): Promise<SessionContext> {
	let value: unknown;
	try {
		value = JSON.parse(await readFile(file, "utf8"));
	} catch (error) {
		throw new Error(`Could not read Pi session context ${file}: ${String(error)}`);
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid(file);
	const record = value as Record<string, unknown>;
	if (record.version !== 1 || record.sessionId !== sessionId || !Array.isArray(record.plans)) throw invalid(file);
	const seen = new Set<string>();
	for (const entry of record.plans) {
		if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw invalid(file);
		const plan = entry as Record<string, unknown>;
		if (typeof plan.id !== "string" || !PLAN_ID_PATTERN.test(plan.id) || seen.has(plan.id) ||
			typeof plan.title !== "string" || !plan.title.trim() || typeof plan.path !== "string") throw invalid(file);
		if (plan.path !== `${path.basename(file, ".context.json")}.plans/${plan.id}.md`) throw invalid(file);
		seen.add(plan.id);
	}
	const pullRequests = record.pullRequests === undefined ? [] : record.pullRequests;
	if (!Array.isArray(pullRequests)) throw invalid(file);
	const seenPullRequests = new Set<string>();
	for (const entry of pullRequests) {
		if (typeof entry !== "string" || seenPullRequests.has(entry)) throw invalid(file);
		try {
			if (canonicalPullRequest(entry) !== entry) throw invalid(file);
		} catch {
			throw invalid(file);
		}
		seenPullRequests.add(entry);
	}
	return { ...record, pullRequests } as SessionContext;
}

async function writeContext(file: string, context: SessionContext): Promise<void> {
	const temporary = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
	try {
		await writeFile(temporary, `${JSON.stringify(context, null, 2)}\n`, { mode: 0o600 });
		await rename(temporary, file);
	} catch (error) {
		await unlink(temporary).catch(() => undefined);
		throw error;
	}
}

function invalid(file: string): Error {
	return new Error(`Invalid Pi session context: ${file}`);
}

function errorCode(error: unknown): string | undefined {
	return error && typeof error === "object" ? (error as NodeJS.ErrnoException).code : undefined;
}

function serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
	const previous = queues.get(key) ?? Promise.resolve();
	const result = previous.then(operation, operation);
	const settled = result.then(() => undefined, () => undefined);
	queues.set(key, settled);
	void settled.then(() => { if (queues.get(key) === settled) queues.delete(key); });
	return result;
}
