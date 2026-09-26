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
import { createSessionClient } from "../dotfiles/pi/.pi/agent/lib/pi-live/session-client.ts";
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
		await writeFile(path.join(store.statusDir, ".json"), "{}\n");
		await writeFile(path.join(store.statusDir, "ignored.tmp"), "{}\n");

		assert.equal(await store.read("broken"), undefined);
		assert.equal(await store.read("future"), undefined);
		assert.deepEqual(
			(await store.list()).map((record) => record.sessionId),
			["seed"],
		);
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

test("session client lists live same-cwd sessions and removes stale records", async () => {
	const dataDir = await mkdtemp(path.join(tmpdir(), "pi-live-list-"));
	const store = createStatusStore(dataDir);
	const first = await startSocketServer({
		dataDir,
		pid: process.pid,
		pi: fakePi([]),
		getContext: () => fakeContext("first", "/same"),
		onError: (message) => assert.fail(message),
	});
	const second = await startSocketServer({
		dataDir,
		pid: process.pid,
		pi: fakePi([]),
		getContext: () => fakeContext("second", "/same"),
		onError: (message) => assert.fail(message),
	});

	try {
		await store.write(
			status({
				sessionId: "second",
				cwd: "/same",
				socketPath: second.socketPath,
			}),
		);
		await store.write(
			status({
				sessionId: "first",
				cwd: "/same",
				socketPath: first.socketPath,
			}),
		);
		await store.write(
			status({
				sessionId: "stale",
				cwd: "/same",
				socketPath: path.join(dataDir, "sockets", "missing.sock"),
			}),
		);

		const sessions = await createSessionClient({ dataDir }).listSessions();
		assert.deepEqual(
			sessions.map((session) => session.sessionId),
			["first", "second"],
		);
		assert.equal(await store.read("stale"), undefined);
	} finally {
		await first.close();
		await second.close();
		await rm(dataDir, { recursive: true, force: true });
	}
});

test("session client sends exact reply-addressed immediate and follow-up messages", async () => {
	const dataDir = await mkdtemp(path.join(tmpdir(), "pi-live-send-"));
	const store = createStatusStore(dataDir);
	const senderMessages: unknown[] = [];
	const idleMessages: unknown[] = [];
	const workingMessages: unknown[] = [];
	const sender = await startSocketServer({
		dataDir,
		pid: process.pid,
		pi: fakePi(senderMessages),
		getContext: () => fakeContext("sender", "/sender"),
		onError: (message) => assert.fail(message),
	});
	const idleTarget = await startSocketServer({
		dataDir,
		pid: process.pid,
		pi: fakePi(idleMessages),
		getContext: () => fakeContext("idle-target", "/idle"),
		onError: (message) => assert.fail(message),
	});
	const workingTarget = await startSocketServer({
		dataDir,
		pid: process.pid,
		pi: fakePi(workingMessages),
		getContext: () => fakeContext("working-target", "/working", () => false),
		onError: (message) => assert.fail(message),
	});

	try {
		await store.write(
			status({
				sessionId: "sender",
				name: "Sending session",
				cwd: "/sender",
				socketPath: sender.socketPath,
			}),
		);
		await store.write(
			status({
				sessionId: "idle-target",
				cwd: "/idle",
				socketPath: idleTarget.socketPath,
			}),
		);
		await store.write(
			status({
				sessionId: "working-target",
				cwd: "/working",
				socketPath: workingTarget.socketPath,
				state: "working",
			}),
		);

		const client = createSessionClient({ dataDir });
		const immediate = await client.sendMessage({
			senderSessionId: "sender",
			targetSessionId: "idle-target",
			message: "Please review the change.",
		});
		assert.equal(immediate.delivery, "immediate");
		assert.deepEqual(senderMessages, []);
		assert.equal(idleMessages.length, 1);
		assert.equal(typeof idleMessages[0], "string");
		const delivered = idleMessages[0] as string;
		assert.match(delivered, /Sender session ID: sender/);
		assert.match(delivered, /Sender name: Sending session/);
		assert.match(delivered, /Sender cwd: \/sender/);
		assert.match(delivered, /send_pi_message/);
		assert.match(delivered, /targetSessionId="sender"/);
		assert.match(delivered, /Please review the change\./);
		assert.doesNotMatch(delivered, new RegExp(sender.socketPath));
		assert.doesNotMatch(delivered, new RegExp(idleTarget.socketPath));

		const followUp = await client.sendMessage({
			senderSessionId: "sender",
			targetSessionId: "working-target",
			message: "Reply after the current task.",
		});
		assert.equal(followUp.delivery, "followUp");
		assert.equal(workingMessages.length, 1);

		await assert.rejects(
			client.sendMessage({
				senderSessionId: "sender",
				targetSessionId: "sender",
				message: "self",
			}),
			/Cannot send a Pi message to the current session/,
		);
		await assert.rejects(
			client.sendMessage({
				senderSessionId: "sender",
				targetSessionId: "missing",
				message: "missing",
			}),
			/Target Pi session is not published/,
		);
		await assert.rejects(
			client.sendMessage({
				senderSessionId: "sender",
				targetSessionId: "idle-target",
				message: "   ",
			}),
			/Message must not be empty/,
		);
		await assert.rejects(
			client.sendMessage({
				senderSessionId: "sender",
				targetSessionId: "idle-target",
				message: "x".repeat(256 * 1024),
			}),
			/Delivered message exceeds 262144 bytes/,
		);

		await store.write(
			status({
				sessionId: "stale-target",
				socketPath: path.join(dataDir, "sockets", "gone.sock"),
			}),
		);
		await assert.rejects(
			client.sendMessage({
				senderSessionId: "sender",
				targetSessionId: "stale-target",
				message: "stale",
			}),
			/Target Pi session is unreachable/,
		);
		assert.equal(await store.read("stale-target"), undefined);
	} finally {
		await sender.close();
		await idleTarget.close();
		await workingTarget.close();
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
		let published = await store.read("runtime-session");
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
