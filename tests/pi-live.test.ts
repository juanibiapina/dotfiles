import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import test from "node:test";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { registerPiLive } from "../dotfiles/pi/.pi/agent/lib/pi-live/runtime.ts";
import { contextPathFor, deletePlan, getSessionContext, savePlan } from "../dotfiles/pi/.pi/agent/lib/pi-live/session-context.ts";
import {
	sendSocketRequest,
	startSocketServer,
} from "../dotfiles/pi/.pi/agent/lib/pi-live/socket-server.ts";
import {
	createStatusStore,
	type PiSessionStatus,
} from "../dotfiles/pi/.pi/agent/lib/pi-live/status-store.ts";

test("status store keeps sessions in one cwd separate and private", async () => {
	const dataDir = await mkdtemp(path.join(tmpdir(), "pi-live-status-"));
	try {
		const store = createStatusStore(dataDir);
		const first = status({
			sessionId: "first",
			cwd: "/same",
			socketPath: "/tmp/first.sock",
		});
		const second = status({
			sessionId: "second",
			cwd: "/same",
			socketPath: "/tmp/second.sock",
		});

		await store.write(first);
		await store.write(second);

		assert.deepEqual(await readStatusFile(dataDir, "first"), first);
		assert.deepEqual(await readStatusFile(dataDir, "second"), second);
		const legacy = status({ sessionId: "legacy", tmux: {
			paneId: "%0", sessionName: "main", windowIndex: 0, windowName: "old",
		} });
		await store.write(legacy);
		assert.deepEqual(await readStatusFile(dataDir, "legacy"), legacy);
		assert.equal((await stat(path.join(dataDir, "status"))).mode & 0o777, 0o700);
		assert.equal((await stat(statusFile(dataDir, "first"))).mode & 0o777, 0o600);

		await store.remove("first");
		await assert.rejects(stat(statusFile(dataDir, "first")), { code: "ENOENT" });
		assert.deepEqual(await readStatusFile(dataDir, "second"), second);
	} finally {
		await rm(dataDir, { recursive: true, force: true });
	}
});

test("two socket servers in one cwd accept independent messages", async () => {
	const dataDir = await mkdtemp(path.join(tmpdir(), "pi-live-sockets-"));
	const firstMessages: unknown[] = [];
	const secondMessages: unknown[] = [];
	const firstContext = fakeContext("first", "/same");
	const secondContext = fakeContext("second", "/same");
	const firstPi = fakePi(firstMessages);
	const secondPi = fakePi(secondMessages);
	const first = await startSocketServer({
		dataDir,
		pid: process.pid,
		pi: firstPi,
		getContext: () => firstContext,
		onError: (message) => assert.fail(message),
	});
	const second = await startSocketServer({
		dataDir,
		pid: process.pid,
		pi: secondPi,
		getContext: () => secondContext,
		onError: (message) => assert.fail(message),
	});

	try {
		assert.notEqual(first.socketPath, second.socketPath);
		assert.ok(Buffer.byteLength(first.socketPath, "utf8") <= 103);
		assert.ok(Buffer.byteLength(second.socketPath, "utf8") <= 103);
		assert.equal(
			(await sendSocketRequest(first.socketPath, { type: "ping" })).ok,
			true,
		);
		assert.equal(
			(await sendSocketRequest(second.socketPath, { type: "ping" })).ok,
			true,
		);
		const stateResponse = await sendSocketRequest(first.socketPath, {
			type: "get_state",
		});
		assert.deepEqual(stateResponse.result, {
			sessionId: "first",
			cwd: "/same",
			state: "idle",
			idle: true,
			hasPendingMessages: false,
			sessionFile: "/sessions/first.jsonl",
		});

		await sendSocketRequest(first.socketPath, {
			type: "send_user_message",
			message: "first message",
		});
		await sendSocketRequest(second.socketPath, {
			type: "send_user_message",
			message: "second message",
		});
		assert.deepEqual(firstMessages, ["first message"]);
		assert.deepEqual(secondMessages, ["second message"]);
	} finally {
		await first.close();
		await second.close();
		await rm(dataDir, { recursive: true, force: true });
	}
});

test("Pi publishes the tmux server socket with its pane", async () => {
	const dataDir = await mkdtemp(path.join(tmpdir(), "pi-tmux-"));
	const handlers = new Map<string, (event: unknown, ctx: ExtensionContext) => Promise<void> | void>();
	const previousTmux = process.env.TMUX;
	process.env.TMUX = "/tmp/current-tmux.sock,1,0";
	const pi = fakePi([], handlers);
	pi.exec = async (_command, args) => ({
		stdout: `%0\u001fmain\u001f0\u001fwindow\u001f/tmp/current-tmux.sock\n`,
		stderr: "", code: args.includes("-t") ? 0 : 1, killed: false,
	});
	const ctx = fakeContext("with-tmux", "/project", () => true, null);
	const store = createStatusStore(dataDir);
	registerPiLive(pi, { dataDir, paneId: "%0" });
	try {
		await emit(handlers, "session_start", { type: "session_start", reason: "startup" }, ctx);
		const published = await readStatusFile(dataDir, "with-tmux");
		assert.equal(published?.tmux?.socketPath, "/tmp/current-tmux.sock");
		assert.notEqual(published?.tmux?.socketPath, published?.socketPath);
		await emit(handlers, "session_shutdown", { type: "session_shutdown", reason: "exit" }, ctx);
	} finally {
		if (previousTmux === undefined) delete process.env.TMUX;
		else process.env.TMUX = previousTmux;
		await rm(dataDir, { recursive: true, force: true });
	}
});

test("Pi lifecycle events publish working and idle state", async () => {
	const dataDir = await mkdtemp(path.join(tmpdir(), "pi-live-runtime-"));
	const handlers = new Map<
		string,
		(event: unknown, ctx: ExtensionContext) => Promise<void> | void
	>();
	let sessionName = "status publisher";
	const messages: unknown[] = [];
	const pi = fakePi(messages, handlers, () => sessionName);
	const ctx = fakeContext("runtime-session", "/project", () => true, path.join(dataDir, "runtime-session.jsonl"));
	const store = createStatusStore(dataDir);

	registerPiLive(pi, { dataDir, paneId: "" });
	try {
		await emit(
			handlers,
			"session_start",
			{ type: "session_start", reason: "startup" },
			ctx,
		);
		let published = await readStatusFile(dataDir, "runtime-session");
		assert.ok(published);
		const socketPath = published.socketPath;
		assert.equal(published.state, "idle");
		assert.equal(published.name, "status publisher");
		const contextPath = contextPathFor(path.join(dataDir, "runtime-session.jsonl"), "runtime-session");
		assert.equal(published.contextPath, contextPath);
		assert.deepEqual(JSON.parse(await readFile(contextPath, "utf8")), { version: 1, sessionId: "runtime-session", plans: [] });
		assert.equal(
			(await sendSocketRequest(socketPath, { type: "ping" })).ok,
			true,
		);

		await emit(handlers, "agent_start", { type: "agent_start" }, ctx);
		published = await readStatusFile(dataDir, "runtime-session");
		assert.equal(published?.state, "working");

		await emit(handlers, "agent_settled", { type: "agent_settled" }, ctx);
		published = await readStatusFile(dataDir, "runtime-session");
		assert.equal(published?.state, "idle");

		sessionName = "renamed session";
		await emit(
			handlers,
			"session_info_changed",
			{ type: "session_info_changed", name: sessionName },
			ctx,
		);
		published = await readStatusFile(dataDir, "runtime-session");
		assert.equal(published?.name, "renamed session");

		await emit(
			handlers,
			"session_shutdown",
			{ type: "session_shutdown", reason: "exit" },
			ctx,
		);
		assert.equal(await readStatusFile(dataDir, "runtime-session"), undefined);
		assert.deepEqual(JSON.parse(await readFile(contextPath, "utf8")), { version: 1, sessionId: "runtime-session", plans: [] });
		await assert.rejects(sendSocketRequest(socketPath, { type: "ping" }));
	} finally {
		await rm(dataDir, { recursive: true, force: true });
	}
});

test("session plans remain editable and separate across sessions", async () => {
	const directory = await mkdtemp(path.join(tmpdir(), "pi-live-plans-"));
	const sessionFile = path.join(directory, "first.jsonl");
	try {
		const saved = await savePlan(sessionFile, "first", "Build search", "# Search\nDraft\n");
		const [other, concurrent] = await Promise.all([
			savePlan(sessionFile, "first", "Build search", "# Second\n"),
			savePlan(sessionFile, "first", "Review search", "# Review\n"),
		]);
		assert.notEqual(saved.id, other.id);
		assert.equal(contextPathFor(sessionFile, "first"), `${sessionFile}.context.json`);
		assert.equal(path.dirname(saved.path), `${sessionFile}.plans`);
		assert.equal(await readFile(saved.path, "utf8"), "# Search\nDraft\n");
		await writeFile(saved.path, "# Search\nRevised\n");
		const listed = await getSessionContext(sessionFile, "first");
		assert.deepEqual(listed.plans, [saved, other, concurrent]);
		await assert.rejects(savePlan(sessionFile, "first", "  ", "# No"), /must not be blank/);
		await assert.rejects(savePlan(sessionFile, "first", "No", "x".repeat(262145)), /exceeds 262144 bytes/);
		await assert.rejects(getSessionContext(sessionFile, "../wrong"), /invalid Pi session ID/);
		assert.equal(await readFile(listed.plans[0].path, "utf8"), "# Search\nRevised\n");
		assert.deepEqual((await getSessionContext(path.join(directory, "second.jsonl"), "second")).plans, []);
		assert.deepEqual(await deletePlan(sessionFile, "first", other.id), other);
		await assert.rejects(stat(other.path), /ENOENT/);
		assert.deepEqual((await getSessionContext(sessionFile, "first")).plans, [saved, concurrent]);
		await assert.rejects(deletePlan(sessionFile, "first", other.id), /Plan not found/);
		await assert.rejects(deletePlan(path.join(directory, "second.jsonl"), "second", saved.id), /Plan not found/);
		await unlink(concurrent.path);
		await deletePlan(sessionFile, "first", concurrent.id);
		assert.deepEqual((await getSessionContext(sessionFile, "first")).plans, [saved]);
		assert.equal((await stat(listed.contextPath)).mode & 0o777, 0o600);
		assert.equal((await stat(saved.path)).mode & 0o777, 0o600);
		assert.equal((await stat(path.dirname(saved.path))).mode & 0o777, 0o700);
		await writeFile(listed.contextPath, "{broken");
		await assert.rejects(getSessionContext(sessionFile, "first"), /Could not read Pi session context/);
		await assert.rejects(savePlan(sessionFile, "first", "More", "# More"), /Could not read Pi session context/);
		assert.equal(await readFile(listed.contextPath, "utf8"), "{broken");
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

async function readStatusFile(
	dataDir: string,
	sessionId: string,
): Promise<PiSessionStatus | undefined> {
	try {
		return JSON.parse(await readFile(statusFile(dataDir, sessionId), "utf8")) as PiSessionStatus;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw error;
	}
}

function statusFile(dataDir: string, sessionId: string): string {
	return path.join(dataDir, "status", `${sessionId}.json`);
}

function status(overrides: Partial<PiSessionStatus> = {}): PiSessionStatus {
	return {
		version: 1,
		sessionId: "session",
		pid: process.pid,
		cwd: "/project",
		socketPath: "/tmp/pi-live.sock",
		startedAt: "2026-09-15T00:00:00.000Z",
		updatedAt: "2026-09-15T00:00:01.000Z",
		state: "idle",
		...overrides,
	};
}

function fakeContext(
	sessionId: string,
	cwd: string,
	isIdle: () => boolean = () => true,
	sessionFile: string | null = `/sessions/${sessionId}.jsonl`,
): ExtensionContext {
	return {
		cwd,
		hasUI: false,
		isIdle,
		hasPendingMessages: () => false,
		abort: () => undefined,
		shutdown: () => undefined,
		compact: () => undefined,
		ui: { setEditorText: () => undefined },
		sessionManager: {
			getSessionId: () => sessionId,
			getSessionFile: () => sessionFile ?? undefined,
		},
	} as unknown as ExtensionContext;
}

function fakePi(
	messages: unknown[],
	handlers?: Map<
		string,
		(event: unknown, ctx: ExtensionContext) => Promise<void> | void
	>,
	getName: () => string | undefined = () => undefined,
): ExtensionAPI {
	return {
		on: (
			event: string,
			handler: (event: unknown, ctx: ExtensionContext) => Promise<void> | void,
		) => handlers?.set(event, handler),
		getSessionName: getName,
		sendUserMessage: (message: unknown) => messages.push(message),
		exec: async () => ({ stdout: "", stderr: "", code: 1, killed: false }),
	} as unknown as ExtensionAPI;
}

async function emit(
	handlers: Map<
		string,
		(event: unknown, ctx: ExtensionContext) => Promise<void> | void
	>,
	name: string,
	event: unknown,
	ctx: ExtensionContext,
): Promise<void> {
	const handler = handlers.get(name);
	assert.ok(handler, `missing ${name} handler`);
	await handler(event, ctx);
}
