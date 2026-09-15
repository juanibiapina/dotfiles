import { randomBytes } from "node:crypto";
import { unlinkSync } from "node:fs";
import { chmod, lstat, mkdir, unlink } from "node:fs/promises";
import * as net from "node:net";
import * as path from "node:path";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import {
	type ActualDelivery,
	extractResponseId,
	failure,
	formatUnknownError,
	getErrorCode,
	type HandlerResult,
	type JsonObject,
	MAX_JSONL_LINE_BYTES,
	MAX_TEXT_MESSAGE_BYTES,
	PROTOCOL_VERSION,
	RequestError,
	type ResponseId,
	readDelivery,
	readImages,
	requireObject,
	success,
	type UserContent,
	validateProtocolVersion,
} from "./protocol.ts";

const UNIX_SOCKET_PATH_MAX_BYTES = process.platform === "linux" ? 107 : 103;
const REQUEST_TIMEOUT_MS = 500;
const SOCKET_CREATE_ATTEMPTS = 8;

export type SocketServer = {
	readonly socketPath: string;
	close(): Promise<void>;
	removeFileSync(): void;
};

export type SocketServerOptions = {
	dataDir: string;
	pid: number;
	pi: ExtensionAPI;
	getContext: () => ExtensionContext;
	onError: (message: string) => void;
};

export async function startSocketServer(
	options: SocketServerOptions,
): Promise<SocketServer> {
	const socketDir = path.join(options.dataDir, "sockets");
	await mkdir(socketDir, { recursive: true, mode: 0o700 });
	await chmod(socketDir, 0o700);

	let lastError: unknown;
	for (let attempt = 0; attempt < SOCKET_CREATE_ATTEMPTS; attempt += 1) {
		const socketPath = path.join(
			socketDir,
			`${options.pid}-${randomBytes(4).toString("hex")}.sock`,
		);
		if (Buffer.byteLength(socketPath, "utf8") > UNIX_SOCKET_PATH_MAX_BYTES) {
			throw new Error(
				`Pi live socket path is too long (${Buffer.byteLength(socketPath, "utf8")} bytes > ${UNIX_SOCKET_PATH_MAX_BYTES}): ${socketPath}`,
			);
		}
		if (await pathExists(socketPath)) continue;

		try {
			const server = await listen(socketPath, options);
			const response = await sendSocketRequest(socketPath, {
				type: "ping",
				protocolVersion: PROTOCOL_VERSION,
			});
			const result = response.result as JsonObject | undefined;
			if (response.ok !== true || result?.type !== "pong") {
				await server.close();
				throw new Error("Pi live socket did not answer ping after startup");
			}
			return server;
		} catch (error) {
			lastError = error;
			if (getErrorCode(error) !== "EADDRINUSE") throw error;
		}
	}

	throw new Error(
		`Could not create a unique Pi live socket: ${formatUnknownError(lastError)}`,
	);
}

export function sendSocketRequest(
	socketPath: string,
	request: JsonObject,
	timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<JsonObject> {
	return new Promise((resolve, reject) => {
		let settled = false;
		let buffer = Buffer.alloc(0);
		const socket = net.createConnection(socketPath);
		const timeout = setTimeout(
			() => finish(new Error(`Pi live socket timed out after ${timeoutMs}ms`)),
			timeoutMs,
		);

		const finish = (error?: Error, response?: JsonObject) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			socket.destroy();
			if (error) reject(error);
			else if (response) resolve(response);
			else reject(new Error("Pi live socket closed without a response"));
		};

		socket.on("connect", () => socket.write(`${JSON.stringify(request)}\n`));
		socket.on("data", (chunk) => {
			const chunkBuffer =
				typeof chunk === "string" ? Buffer.from(chunk) : chunk;
			buffer = Buffer.concat([buffer, chunkBuffer]);
			if (buffer.length > MAX_JSONL_LINE_BYTES) {
				finish(
					new Error(`Pi live response exceeds ${MAX_JSONL_LINE_BYTES} bytes`),
				);
				return;
			}

			const newlineIndex = buffer.indexOf(0x0a);
			if (newlineIndex === -1) return;

			try {
				const response: unknown = JSON.parse(
					buffer.subarray(0, newlineIndex).toString("utf8"),
				);
				if (
					!response ||
					typeof response !== "object" ||
					Array.isArray(response)
				) {
					finish(new Error("Pi live socket returned a non-object response"));
					return;
				}
				finish(undefined, response as JsonObject);
			} catch {
				finish(new Error("Pi live socket returned invalid JSON"));
			}
		});
		socket.on("error", (error) => finish(error));
		socket.on("end", () => finish());
	});
}

async function listen(
	socketPath: string,
	options: SocketServerOptions,
): Promise<SocketServer> {
	const clients = new Set<net.Socket>();
	const server = net.createServer((socket) => {
		clients.add(socket);
		handleConnection(socket, options.getContext, options.pi);
		socket.on("close", () => clients.delete(socket));
	});

	try {
		await listenPrivate(server, socketPath);
		await chmod(socketPath, 0o600);
	} catch (error) {
		server.close();
		await unlinkIfExists(socketPath);
		throw error;
	}

	server.on("error", (error) =>
		options.onError(`Pi live socket error: ${formatUnknownError(error)}`),
	);

	return {
		socketPath,
		async close() {
			for (const client of clients) client.destroy();
			await closeServer(server);
			await unlinkIfExists(socketPath);
		},
		removeFileSync() {
			try {
				unlinkSync(socketPath);
			} catch (error) {
				if (getErrorCode(error) !== "ENOENT") throw error;
			}
		},
	};
}

function handleConnection(
	socket: net.Socket,
	getContext: () => ExtensionContext,
	pi: ExtensionAPI,
): void {
	let buffer = Buffer.alloc(0);
	let queue = Promise.resolve();

	socket.on("data", (chunk) => {
		const chunkBuffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
		buffer = Buffer.concat([buffer, chunkBuffer]);

		while (true) {
			const newlineIndex = buffer.indexOf(0x0a);
			if (newlineIndex === -1) break;

			const line = buffer.subarray(0, newlineIndex);
			buffer = buffer.subarray(newlineIndex + 1);

			if (line.length === 0) continue;
			if (line.length > MAX_JSONL_LINE_BYTES) {
				writeResponse(
					socket,
					failure(
						undefined,
						"payload_too_large",
						`JSONL line exceeds ${MAX_JSONL_LINE_BYTES} bytes`,
					),
					() => socket.destroy(),
				);
				return;
			}

			queue = queue.then(() => handleLine(line, socket, getContext(), pi));
		}

		if (buffer.length > MAX_JSONL_LINE_BYTES) {
			writeResponse(
				socket,
				failure(
					undefined,
					"payload_too_large",
					`JSONL line exceeds ${MAX_JSONL_LINE_BYTES} bytes`,
				),
				() => socket.destroy(),
			);
		}
	});

	socket.on("error", () => undefined);
}

async function handleLine(
	line: Buffer,
	socket: net.Socket,
	ctx: ExtensionContext,
	pi: ExtensionAPI,
): Promise<void> {
	let request: unknown;
	try {
		request = JSON.parse(line.toString("utf8"));
	} catch {
		writeResponse(
			socket,
			failure(undefined, "bad_json", "request must be valid JSON"),
		);
		return;
	}

	const id = extractResponseId(request);
	try {
		const result = handleRequest(request, id, ctx, pi);
		writeResponse(socket, result.response, result.afterWrite);
	} catch (error) {
		if (error instanceof RequestError) {
			writeResponse(socket, failure(id, error.code, error.message));
			return;
		}
		writeResponse(
			socket,
			failure(id, "internal_error", formatUnknownError(error)),
		);
	}
}

function handleRequest(
	request: unknown,
	id: ResponseId,
	ctx: ExtensionContext,
	pi: ExtensionAPI,
): HandlerResult {
	const object = requireObject(request, "request must be an object");
	validateProtocolVersion(object);

	const type = object.type;
	if (typeof type !== "string")
		throw new RequestError("bad_request", "type must be a string");

	switch (type) {
		case "ping":
			return { response: success(id, { type: "pong" }) };
		case "get_state":
			return { response: success(id, getState(ctx, pi)) };
		case "send_user_message":
			return { response: success(id, sendUserMessage(object, ctx, pi)) };
		case "abort":
			ctx.abort();
			return { response: success(id, { aborted: true }) };
		case "shutdown":
			return {
				response: success(id, { shutdownRequested: true }),
				afterWrite: () => ctx.shutdown(),
			};
		case "set_editor_text":
			return { response: success(id, setEditorText(object, ctx)) };
		case "compact":
			return { response: success(id, compact(object, ctx)) };
		default:
			throw new RequestError("unknown_type", `unknown request type: ${type}`);
	}
}

function getState(ctx: ExtensionContext, pi: ExtensionAPI): JsonObject {
	const idle = ctx.isIdle();
	const result: JsonObject = {
		sessionId: ctx.sessionManager.getSessionId(),
		cwd: path.resolve(ctx.cwd),
		state: idle ? "idle" : "working",
		idle,
		hasPendingMessages: ctx.hasPendingMessages(),
	};

	const sessionFile = ctx.sessionManager.getSessionFile();
	if (sessionFile) result.sessionFile = sessionFile;

	const sessionName = pi.getSessionName();
	if (sessionName) result.sessionName = sessionName;

	return result;
}

function sendUserMessage(
	request: JsonObject,
	ctx: ExtensionContext,
	pi: ExtensionAPI,
): JsonObject {
	const message = request.message;
	if (typeof message !== "string")
		throw new RequestError("bad_request", "message must be a string");
	if (Buffer.byteLength(message, "utf8") > MAX_TEXT_MESSAGE_BYTES) {
		throw new RequestError(
			"payload_too_large",
			`message exceeds ${MAX_TEXT_MESSAGE_BYTES} bytes`,
		);
	}

	const delivery = readDelivery(request.delivery);
	const images = readImages(request.images);
	const content: UserContent =
		images.length === 0
			? message
			: [{ type: "text", text: message }, ...images];
	const idle = ctx.isIdle();

	if (!idle && delivery === "immediate")
		throw new RequestError("busy", "Pi is busy");

	let actualDelivery: ActualDelivery;
	if (idle) {
		actualDelivery = "immediate";
		pi.sendUserMessage(content);
	} else {
		actualDelivery = delivery === "steer" ? "steer" : "followUp";
		pi.sendUserMessage(content, { deliverAs: actualDelivery });
	}

	return { accepted: true, delivery: actualDelivery };
}

function setEditorText(request: JsonObject, ctx: ExtensionContext): JsonObject {
	if (!ctx.hasUI)
		throw new RequestError("no_ui", "set_editor_text requires interactive UI");

	const text = request.text;
	if (typeof text !== "string")
		throw new RequestError("bad_request", "text must be a string");
	if (Buffer.byteLength(text, "utf8") > MAX_TEXT_MESSAGE_BYTES) {
		throw new RequestError(
			"payload_too_large",
			`text exceeds ${MAX_TEXT_MESSAGE_BYTES} bytes`,
		);
	}

	ctx.ui.setEditorText(text);
	return { set: true };
}

function compact(request: JsonObject, ctx: ExtensionContext): JsonObject {
	const customInstructions = request.customInstructions;
	if (
		customInstructions !== undefined &&
		typeof customInstructions !== "string"
	) {
		throw new RequestError(
			"bad_request",
			"customInstructions must be a string",
		);
	}
	if (
		typeof customInstructions === "string" &&
		Buffer.byteLength(customInstructions, "utf8") > MAX_TEXT_MESSAGE_BYTES
	) {
		throw new RequestError(
			"payload_too_large",
			`customInstructions exceeds ${MAX_TEXT_MESSAGE_BYTES} bytes`,
		);
	}

	ctx.compact(
		typeof customInstructions === "string" ? { customInstructions } : undefined,
	);
	return { compactionRequested: true };
}

function writeResponse(
	socket: net.Socket,
	response: JsonObject,
	afterWrite?: () => void,
): void {
	const line = `${JSON.stringify(response)}\n`;
	if (afterWrite) {
		socket.write(line, () => afterWrite());
		return;
	}
	socket.write(line);
}

async function listenPrivate(
	server: net.Server,
	socketPath: string,
): Promise<void> {
	const oldUmask = process.umask(0o177);
	try {
		await new Promise<void>((resolve, reject) => {
			const onError = (error: Error) => {
				server.off("listening", onListening);
				reject(error);
			};
			const onListening = () => {
				server.off("error", onError);
				resolve();
			};

			server.once("error", onError);
			server.once("listening", onListening);
			server.listen(socketPath);
		});
	} finally {
		process.umask(oldUmask);
	}
}

async function closeServer(server: net.Server): Promise<void> {
	await new Promise<void>((resolve) => {
		if (!server.listening) {
			resolve();
			return;
		}
		server.close(() => resolve());
	});
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await lstat(filePath);
		return true;
	} catch (error) {
		if (getErrorCode(error) === "ENOENT") return false;
		throw error;
	}
}

async function unlinkIfExists(filePath: string): Promise<void> {
	try {
		await unlink(filePath);
	} catch (error) {
		if (getErrorCode(error) !== "ENOENT") throw error;
	}
}
