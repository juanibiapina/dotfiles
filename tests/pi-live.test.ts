import assert from "node:assert/strict";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import test from "node:test";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { registerPiLive } from "../dotfiles/pi/.pi/agent/lib/pi-live/runtime.ts";
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

		assert.deepEqual(await store.read("first"), first);
		assert.deepEqual(await store.read("second"), second);
		assert.equal((await stat(store.statusDir)).mode & 0o777, 0o700);
		assert.equal((await stat(store.pathFor("first"))).mode & 0o777, 0o600);

		await store.remove("first");
		assert.equal(await store.read("first"), undefined);
		assert.deepEqual(await store.read("second"), second);
	} finally {
		await rm(dataDir, { recursive: true, force: true });
	}
});

test("status store ignores invalid and unsupported records", async () => {
	const dataDir = await mkdtemp(path.join(tmpdir(), "pi-live-invalid-"));
	try {
		const store = createStatusStore(dataDir);
		await writeFile(store.pathFor("broken"), "{not json\n", {
			flag: "w",
		}).catch(async (error) => {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			await store.write(status({ sessionId: "seed" }));
			await writeFile(store.pathFor("broken"), "{not json\n");
		});
		await writeFile(
			store.pathFor("future"),
			`${JSON.stringify({ ...status({ sessionId: "future" }), version: 2 })}\n`,
		);

		assert.equal(await store.read("broken"), undefined);
		assert.equal(await store.read("future"), undefined);
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

test("Pi lifecycle events publish working and idle state", async () => {
	const dataDir = await mkdtemp(path.join(tmpdir(), "pi-live-runtime-"));
	const handlers = new Map<
		string,
		(event: unknown, ctx: ExtensionContext) => Promise<void> | void
	>();
	let sessionName = "status publisher";
	const messages: unknown[] = [];
	const pi = fakePi(messages, handlers, () => sessionName);
	const ctx = fakeContext("runtime-session", "/project");
	const store = createStatusStore(dataDir);

	registerPiLive(pi, { dataDir, paneId: "" });
	try {
		await emit(
			handlers,
			"session_start",
			{ type: "session_start", reason: "startup" },
			ctx,
		);
		let published = await store.read("runtime-session");
		assert.ok(published);
		const socketPath = published.socketPath;
		assert.equal(published.state, "idle");
		assert.equal(published.name, "status publisher");
		assert.equal(
			(await sendSocketRequest(socketPath, { type: "ping" })).ok,
			true,
		);

		await emit(handlers, "agent_start", { type: "agent_start" }, ctx);
		published = await store.read("runtime-session");
		assert.equal(published?.state, "working");

		await emit(handlers, "agent_settled", { type: "agent_settled" }, ctx);
		published = await store.read("runtime-session");
		assert.equal(published?.state, "idle");

		sessionName = "renamed session";
		await emit(
			handlers,
			"session_info_changed",
			{ type: "session_info_changed", name: sessionName },
			ctx,
		);
		published = await store.read("runtime-session");
		assert.equal(published?.name, "renamed session");

		await emit(
			handlers,
			"session_shutdown",
			{ type: "session_shutdown", reason: "exit" },
			ctx,
		);
		assert.equal(await store.read("runtime-session"), undefined);
		await assert.rejects(sendSocketRequest(socketPath, { type: "ping" }));
	} finally {
		await rm(dataDir, { recursive: true, force: true });
	}
});

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

function fakeContext(sessionId: string, cwd: string): ExtensionContext {
	return {
		cwd,
		hasUI: false,
		isIdle: () => true,
		hasPendingMessages: () => false,
		abort: () => undefined,
		shutdown: () => undefined,
		compact: () => undefined,
		ui: { setEditorText: () => undefined },
		sessionManager: {
			getSessionId: () => sessionId,
			getSessionFile: () => `/sessions/${sessionId}.jsonl`,
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
