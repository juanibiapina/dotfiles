/**
 * pi-socket - project-local Unix socket for the active interactive Pi session.
 *
 * Protocol: newline-delimited JSON over a Unix stream socket at
 *   <cwd>/.local/share/pi/socket
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { ImageContent, TextContent } from "@mariozechner/pi-ai";
import * as net from "node:net";
import { unlinkSync } from "node:fs";
import { chmod, lstat, mkdir, unlink, writeFile } from "node:fs/promises";
import * as path from "node:path";

const PROTOCOL_VERSION = 1;
const SOCKET_RELATIVE_PATH = ".local/share/pi/socket";
const INFO_RELATIVE_PATH = ".local/share/pi/socket.info.json";
const UNIX_SOCKET_PATH_MAX_BYTES = process.platform === "linux" ? 107 : 103;

const MAX_JSONL_LINE_BYTES = 1024 * 1024;
const MAX_TEXT_MESSAGE_BYTES = 256 * 1024;
const MAX_IMAGE_PAYLOAD_BYTES = 10 * 1024 * 1024;
const PROBE_TIMEOUT_MS = 500;

const DELIVERY_VALUES = new Set(["auto", "immediate", "steer", "followUp"]);
const STALE_SOCKET_ERROR_CODES = new Set(["ECONNREFUSED", "ENOENT", "ENOTSOCK"]);

type ErrorCode =
	| "bad_json"
	| "bad_request"
	| "unsupported_version"
	| "unknown_type"
	| "payload_too_large"
	| "busy"
	| "no_ui"
	| "socket_in_use"
	| "internal_error";

type Delivery = "auto" | "immediate" | "steer" | "followUp";
type ActualDelivery = "immediate" | "steer" | "followUp";
type ResponseId = string | number | null | undefined;

type JsonObject = Record<string, unknown>;
type UserContent = string | (TextContent | ImageContent)[];

type HandlerResult = {
	response: JsonObject;
	afterWrite?: () => void;
};

type SocketState = {
	server: net.Server;
	clients: Set<net.Socket>;
	socketPath: string;
	infoPath: string;
	exitHandler: () => void;
};

type ProbeResult =
	| { status: "pong" }
	| { status: "in_use"; message: string }
	| { status: "stale"; message: string };

class RequestError extends Error {
	constructor(
		readonly code: ErrorCode,
		message: string,
	) {
		super(message);
	}
}

export default function (pi: ExtensionAPI) {
	let state: SocketState | undefined;

	async function stopSocket() {
		const current = state;
		if (!current) return;
		state = undefined;

		process.off("exit", current.exitHandler);
		for (const client of current.clients) client.destroy();
		await closeServer(current.server);
		await unlinkIfExists(current.socketPath);
		await unlinkIfExists(current.infoPath);
	}

	async function startSocket(ctx: ExtensionContext) {
		await stopSocket();

		const cwd = path.resolve(ctx.cwd);
		const socketPath = path.join(cwd, SOCKET_RELATIVE_PATH);
		const infoPath = path.join(cwd, INFO_RELATIVE_PATH);
		const socketDir = path.dirname(socketPath);
		const bindPath = process.cwd() === ctx.cwd ? SOCKET_RELATIVE_PATH : socketPath;

		if (bindPath === socketPath && Buffer.byteLength(bindPath, "utf8") > UNIX_SOCKET_PATH_MAX_BYTES) {
			report(
				ctx,
				`pi-socket: socket path is too long for Unix sockets (${Buffer.byteLength(bindPath, "utf8")} bytes > ${UNIX_SOCKET_PATH_MAX_BYTES}): ${bindPath}`,
				"error",
			);
			return;
		}

		let server: net.Server | undefined;
		let bound = false;
		const clients = new Set<net.Socket>();

		try {
			await mkdir(socketDir, { recursive: true, mode: 0o700 });
			await chmod(socketDir, 0o700).catch(() => undefined);

			if (await pathExists(socketPath)) {
				const probe = await probeExistingSocket(bindPath);
				if (probe.status === "pong" || probe.status === "in_use") {
					report(ctx, `pi-socket: socket already in use at ${socketPath}`, "info");
					return;
				}

				await unlinkIfExists(socketPath);
				await unlinkIfExists(infoPath);
			} else {
				await unlinkIfExists(infoPath);
			}

			server = net.createServer((socket) => {
				clients.add(socket);
				handleConnection(socket, ctx, pi);
				socket.on("close", () => clients.delete(socket));
			});

			await listenPrivate(server, bindPath);
			bound = true;
			server.on("error", (error) => report(ctx, `pi-socket: server error: ${formatUnknownError(error)}`, "error"));

			await chmod(socketPath, 0o600).catch(() => undefined);
			await writeMetadata(infoPath, {
				protocolVersion: PROTOCOL_VERSION,
				cwd,
				pid: process.pid,
				socketPath,
				startedAt: new Date().toISOString(),
				...(ctx.sessionManager.getSessionFile() ? { sessionFile: ctx.sessionManager.getSessionFile() } : {}),
			});

			const exitHandler = () => cleanupSocketFilesSync(socketPath, infoPath);
			state = { server, clients, socketPath, infoPath, exitHandler };
			process.once("exit", exitHandler);
			report(ctx, "pi-socket: listening", "info");
		} catch (error) {
			if (bound && server) {
				for (const client of clients) client.destroy();
				await closeServer(server);
				await unlinkIfExists(socketPath);
				await unlinkIfExists(infoPath);
			}

			const code = getErrorCode(error);
			if (code === "EADDRINUSE") {
				report(ctx, `pi-socket: socket already in use at ${socketPath}`, "info");
				return;
			}

			report(ctx, `pi-socket: failed to start socket: ${formatUnknownError(error)}`, "error");
		}
	}

	pi.on("session_start", async (_event, ctx) => {
		await startSocket(ctx);
	});

	pi.on("session_shutdown", async () => {
		await stopSocket();
	});
}

function handleConnection(socket: net.Socket, ctx: ExtensionContext, pi: ExtensionAPI) {
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
				writeResponse(socket, failure(undefined, "payload_too_large", `JSONL line exceeds ${MAX_JSONL_LINE_BYTES} bytes`), () => socket.destroy());
				return;
			}

			queue = queue.then(() => handleLine(line, socket, ctx, pi));
		}

		if (buffer.length > MAX_JSONL_LINE_BYTES) {
			writeResponse(socket, failure(undefined, "payload_too_large", `JSONL line exceeds ${MAX_JSONL_LINE_BYTES} bytes`), () => socket.destroy());
		}
	});

	socket.on("error", () => undefined);
}

async function handleLine(line: Buffer, socket: net.Socket, ctx: ExtensionContext, pi: ExtensionAPI) {
	let request: unknown;
	try {
		request = JSON.parse(line.toString("utf8"));
	} catch {
		writeResponse(socket, failure(undefined, "bad_json", "request must be valid JSON"));
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

		writeResponse(socket, failure(id, "internal_error", formatUnknownError(error)));
	}
}

function handleRequest(request: unknown, id: ResponseId, ctx: ExtensionContext, pi: ExtensionAPI): HandlerResult {
	const object = requireObject(request, "request must be an object");
	validateProtocolVersion(object);

	const type = object.type;
	if (typeof type !== "string") throw new RequestError("bad_request", "type must be a string");

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
			return { response: success(id, { shutdownRequested: true }), afterWrite: () => ctx.shutdown() };
		case "set_editor_text":
			return { response: success(id, setEditorText(object, ctx)) };
		case "compact":
			return { response: success(id, compact(object, ctx)) };
		default:
			throw new RequestError("unknown_type", `unknown request type: ${type}`);
	}
}

function getState(ctx: ExtensionContext, pi: ExtensionAPI): JsonObject {
	const result: JsonObject = {
		cwd: path.resolve(ctx.cwd),
		idle: ctx.isIdle(),
		hasPendingMessages: ctx.hasPendingMessages(),
	};

	const sessionFile = ctx.sessionManager.getSessionFile();
	if (sessionFile) result.sessionFile = sessionFile;

	const sessionName = pi.getSessionName();
	if (sessionName) result.sessionName = sessionName;

	return result;
}

function sendUserMessage(request: JsonObject, ctx: ExtensionContext, pi: ExtensionAPI): JsonObject {
	const message = request.message;
	if (typeof message !== "string") throw new RequestError("bad_request", "message must be a string");
	if (Buffer.byteLength(message, "utf8") > MAX_TEXT_MESSAGE_BYTES) {
		throw new RequestError("payload_too_large", `message exceeds ${MAX_TEXT_MESSAGE_BYTES} bytes`);
	}

	const delivery = readDelivery(request.delivery);
	const images = readImages(request.images);
	const content: UserContent = images.length === 0 ? message : [{ type: "text", text: message }, ...images];
	const idle = ctx.isIdle();

	if (!idle && delivery === "immediate") {
		throw new RequestError("busy", "Pi is busy");
	}

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
	if (!ctx.hasUI) throw new RequestError("no_ui", "set_editor_text requires interactive UI");

	const text = request.text;
	if (typeof text !== "string") throw new RequestError("bad_request", "text must be a string");
	if (Buffer.byteLength(text, "utf8") > MAX_TEXT_MESSAGE_BYTES) {
		throw new RequestError("payload_too_large", `text exceeds ${MAX_TEXT_MESSAGE_BYTES} bytes`);
	}

	ctx.ui.setEditorText(text);
	return { set: true };
}

function compact(request: JsonObject, ctx: ExtensionContext): JsonObject {
	const customInstructions = request.customInstructions;
	if (customInstructions !== undefined && typeof customInstructions !== "string") {
		throw new RequestError("bad_request", "customInstructions must be a string");
	}
	if (typeof customInstructions === "string" && Buffer.byteLength(customInstructions, "utf8") > MAX_TEXT_MESSAGE_BYTES) {
		throw new RequestError("payload_too_large", `customInstructions exceeds ${MAX_TEXT_MESSAGE_BYTES} bytes`);
	}

	ctx.compact(typeof customInstructions === "string" ? { customInstructions } : undefined);
	return { compactionRequested: true };
}

function readDelivery(value: unknown): Delivery {
	if (value === undefined) return "auto";
	if (typeof value !== "string" || !DELIVERY_VALUES.has(value)) {
		throw new RequestError("bad_request", "delivery must be one of auto, immediate, steer, followUp");
	}
	return value as Delivery;
}

function readImages(value: unknown): ImageContent[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) throw new RequestError("bad_request", "images must be an array");

	const images: ImageContent[] = [];
	let totalBytes = 0;

	for (const [index, imageValue] of value.entries()) {
		const image = requireObject(imageValue, `images[${index}] must be an object`);
		const mimeType = image.mimeType;
		const data = image.data;

		if (typeof mimeType !== "string") throw new RequestError("bad_request", `images[${index}].mimeType must be a string`);
		if (!mimeType.startsWith("image/")) throw new RequestError("bad_request", `images[${index}].mimeType must start with image/`);
		if (typeof data !== "string") throw new RequestError("bad_request", `images[${index}].data must be a base64 string`);

		const imageBytes = decodedBase64Bytes(data, `images[${index}].data`);
		totalBytes += imageBytes;
		if (totalBytes > MAX_IMAGE_PAYLOAD_BYTES) {
			throw new RequestError("payload_too_large", `images exceed ${MAX_IMAGE_PAYLOAD_BYTES} bytes`);
		}

		images.push({ type: "image", data, mimeType });
	}

	return images;
}

function decodedBase64Bytes(value: string, label: string): number {
	if (value.length === 0) throw new RequestError("bad_request", `${label} must not be empty`);
	if (value.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
		throw new RequestError("bad_request", `${label} must be valid base64`);
	}

	const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
	return Math.floor((value.length * 3) / 4) - padding;
}

function validateProtocolVersion(request: JsonObject) {
	const version = request.protocolVersion;
	if (version !== undefined && version !== PROTOCOL_VERSION) {
		throw new RequestError("unsupported_version", `unsupported protocolVersion: ${String(version)}`);
	}
}

function requireObject(value: unknown, message: string): JsonObject {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new RequestError("bad_request", message);
	return value as JsonObject;
}

function extractResponseId(request: unknown): ResponseId {
	if (!request || typeof request !== "object" || Array.isArray(request)) return undefined;
	const id = (request as JsonObject).id;
	if (id === undefined || id === null || typeof id === "string" || typeof id === "number") return id as ResponseId;
	return undefined;
}

function success(id: ResponseId, result: JsonObject): JsonObject {
	return withOptionalId(id, { ok: true, result });
}

function failure(id: ResponseId, code: ErrorCode, message: string): JsonObject {
	return withOptionalId(id, { ok: false, error: { code, message } });
}

function withOptionalId(id: ResponseId, response: JsonObject): JsonObject {
	if (id !== undefined) return { id, ...response };
	return response;
}

function writeResponse(socket: net.Socket, response: JsonObject, afterWrite?: () => void) {
	const line = `${JSON.stringify(response)}\n`;
	if (afterWrite) {
		socket.write(line, () => afterWrite());
		return;
	}
	socket.write(line);
}

async function listenPrivate(server: net.Server, bindPath: string) {
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
			server.listen(bindPath);
		});
	} finally {
		process.umask(oldUmask);
	}
}

async function probeExistingSocket(socketPath: string): Promise<ProbeResult> {
	return new Promise((resolve) => {
		let settled = false;
		let buffer = "";
		const client = net.createConnection(socketPath);
		const timeout = setTimeout(() => finish({ status: "in_use", message: "existing socket accepted a connection but did not answer ping" }), PROBE_TIMEOUT_MS);

		const finish = (result: ProbeResult) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			client.destroy();
			resolve(result);
		};

		client.on("connect", () => {
			client.write(`${JSON.stringify({ type: "ping" })}\n`);
		});

		client.on("data", (chunk) => {
			buffer += chunk.toString("utf8");
			const newlineIndex = buffer.indexOf("\n");
			if (newlineIndex === -1) return;

			try {
				const response = JSON.parse(buffer.slice(0, newlineIndex)) as JsonObject;
				const result = response.result as JsonObject | undefined;
				if (response.ok === true && result?.type === "pong") {
					finish({ status: "pong" });
					return;
				}
			} catch {
				// Treat parse failures as a live non-pi socket; do not steal it.
			}

			finish({ status: "in_use", message: "existing socket returned a non-ping response" });
		});

		client.on("error", (error) => {
			const code = getErrorCode(error);
			if (code && STALE_SOCKET_ERROR_CODES.has(code)) {
				finish({ status: "stale", message: code });
				return;
			}

			finish({ status: "in_use", message: code ?? formatUnknownError(error) });
		});
	});
}

async function writeMetadata(infoPath: string, metadata: JsonObject) {
	await writeFile(infoPath, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });
	await chmod(infoPath, 0o600).catch(() => undefined);
}

async function closeServer(server: net.Server) {
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

async function unlinkIfExists(filePath: string) {
	try {
		await unlink(filePath);
	} catch (error) {
		if (getErrorCode(error) !== "ENOENT") throw error;
	}
}

function cleanupSocketFilesSync(socketPath: string, infoPath: string) {
	for (const filePath of [socketPath, infoPath]) {
		try {
			unlinkSync(filePath);
		} catch {
			// Best-effort cleanup during process exit.
		}
	}
}

function report(ctx: ExtensionContext, message: string, level: "info" | "warning" | "error") {
	if (ctx.hasUI) {
		ctx.ui.notify(message, level);
		return;
	}

	console.error(message);
}

function formatUnknownError(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

function getErrorCode(error: unknown): string | undefined {
	if (!error || typeof error !== "object") return undefined;
	const code = (error as { code?: unknown }).code;
	return typeof code === "string" ? code : undefined;
}
