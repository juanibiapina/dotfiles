import { unlink } from "node:fs/promises";
import {
	getErrorCode,
	type JsonObject,
	MAX_TEXT_MESSAGE_BYTES,
	PROTOCOL_VERSION,
} from "./protocol.ts";
import { sendSocketRequest } from "./socket-server.ts";
import {
	createStatusStore,
	defaultPiLiveDir,
	type PiSessionStatus,
	type StatusStore,
} from "./status-store.ts";

const STALE_SOCKET_ERROR_CODES = new Set([
	"ECONNREFUSED",
	"ENOENT",
	"ENOTSOCK",
]);

export type SendMessageInput = {
	senderSessionId: string;
	targetSessionId: string;
	message: string;
};

export type SendMessageResult = {
	target: PiSessionStatus;
	delivery: "immediate" | "followUp";
};

export type SessionClient = {
	listSessions(): Promise<PiSessionStatus[]>;
	sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
};

export type SessionClientOptions = {
	dataDir?: string;
	timeoutMs?: number;
};

export function createSessionClient(
	options: SessionClientOptions = {},
): SessionClient {
	const store = createStatusStore(options.dataDir ?? defaultPiLiveDir());
	const timeoutMs = options.timeoutMs;

	return {
		async listSessions() {
			const records = await store.list();
			const live = await Promise.all(
				records.map(async (record) => {
					try {
						const response = await sendSocketRequest(
							record.socketPath,
							{ type: "ping", protocolVersion: PROTOCOL_VERSION },
							timeoutMs,
						);
						const result = response.result as JsonObject | undefined;
						return response.ok === true && result?.type === "pong"
							? record
							: undefined;
					} catch (error) {
						await removeIfStale(store, record, error);
						return undefined;
					}
				}),
			);
			return live.filter(
				(record): record is PiSessionStatus => record !== undefined,
			);
		},

		async sendMessage(input) {
			const message = input.message.trim();
			if (!message) throw new Error("Message must not be empty");
			if (input.senderSessionId === input.targetSessionId) {
				throw new Error("Cannot send a Pi message to the current session");
			}

			const sender = await readRequiredStatus(
				store,
				input.senderSessionId,
				"Current",
			);
			const target = await readRequiredStatus(
				store,
				input.targetSessionId,
				"Target",
			);
			const deliveredMessage = formatDeliveredMessage(sender, message);
			if (
				Buffer.byteLength(deliveredMessage, "utf8") > MAX_TEXT_MESSAGE_BYTES
			) {
				throw new Error(
					`Delivered message exceeds ${MAX_TEXT_MESSAGE_BYTES} bytes`,
				);
			}

			let response: JsonObject;
			try {
				response = await sendSocketRequest(
					target.socketPath,
					{
						type: "send_user_message",
						protocolVersion: PROTOCOL_VERSION,
						message: deliveredMessage,
					},
					timeoutMs,
				);
			} catch (error) {
				await removeIfStale(store, target, error);
				throw new Error(
					`Target Pi session is unreachable: ${formatError(error)}`,
				);
			}

			if (response.ok !== true) throw new Error(readResponseError(response));
			const result = response.result as JsonObject | undefined;
			const delivery = result?.delivery;
			if (
				result?.accepted !== true ||
				(delivery !== "immediate" && delivery !== "followUp")
			) {
				throw new Error(
					"Target Pi session returned an invalid delivery response",
				);
			}
			return { target, delivery };
		},
	};
}

async function readRequiredStatus(
	store: StatusStore,
	sessionId: string,
	label: string,
): Promise<PiSessionStatus> {
	let record: PiSessionStatus | undefined;
	try {
		record = await store.read(sessionId);
	} catch {
		throw new Error(`${label} Pi session ID is invalid: ${sessionId}`);
	}
	if (!record)
		throw new Error(`${label} Pi session is not published: ${sessionId}`);
	return record;
}

function formatDeliveredMessage(
	sender: PiSessionStatus,
	message: string,
): string {
	const lines = [
		"Message from another local Pi session.",
		"",
		`Sender session ID: ${sender.sessionId}`,
	];
	if (sender.name) lines.push(`Sender name: ${singleLine(sender.name)}`);
	lines.push(
		`Sender cwd: ${singleLine(sender.cwd)}`,
		"",
		"To reply, call `send_pi_message` with",
		`\`targetSessionId="${sender.sessionId}"\`.`,
		"",
		"Message:",
		message,
	);
	return lines.join("\n");
}

async function removeIfStale(
	store: StatusStore,
	record: PiSessionStatus,
	error: unknown,
): Promise<void> {
	const code = getErrorCode(error);
	if (!code || !STALE_SOCKET_ERROR_CODES.has(code)) return;
	await Promise.allSettled([
		store.remove(record.sessionId),
		unlink(record.socketPath),
	]);
}

function readResponseError(response: JsonObject): string {
	const error = response.error;
	if (!error || typeof error !== "object" || Array.isArray(error))
		return "Target Pi session rejected the message";
	const message = (error as JsonObject).message;
	return typeof message === "string"
		? `Target Pi session rejected the message: ${message}`
		: "Target Pi session rejected the message";
}

function singleLine(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function formatError(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}
