import type { ImageContent, TextContent } from "@mariozechner/pi-ai";

export const PROTOCOL_VERSION = 1;
export const MAX_JSONL_LINE_BYTES = 1024 * 1024;
export const MAX_TEXT_MESSAGE_BYTES = 256 * 1024;
export const MAX_IMAGE_PAYLOAD_BYTES = 10 * 1024 * 1024;

export type ErrorCode =
	| "bad_json"
	| "bad_request"
	| "unsupported_version"
	| "unknown_type"
	| "payload_too_large"
	| "busy"
	| "no_ui"
	| "internal_error";

export type Delivery = "auto" | "immediate" | "steer" | "followUp";
export type ActualDelivery = "immediate" | "steer" | "followUp";
export type ResponseId = string | number | null | undefined;
export type JsonObject = Record<string, unknown>;
export type UserContent = string | (TextContent | ImageContent)[];

export type HandlerResult = {
	response: JsonObject;
	afterWrite?: () => void;
};

const DELIVERY_VALUES = new Set<Delivery>([
	"auto",
	"immediate",
	"steer",
	"followUp",
]);

export class RequestError extends Error {
	readonly code: ErrorCode;

	constructor(code: ErrorCode, message: string) {
		super(message);
		this.code = code;
	}
}

export function requireObject(value: unknown, message: string): JsonObject {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new RequestError("bad_request", message);
	return value as JsonObject;
}

export function validateProtocolVersion(request: JsonObject): void {
	const version = request.protocolVersion;
	if (version !== undefined && version !== PROTOCOL_VERSION) {
		throw new RequestError(
			"unsupported_version",
			`unsupported protocolVersion: ${String(version)}`,
		);
	}
}

export function extractResponseId(request: unknown): ResponseId {
	if (!request || typeof request !== "object" || Array.isArray(request))
		return undefined;
	const id = (request as JsonObject).id;
	if (
		id === undefined ||
		id === null ||
		typeof id === "string" ||
		typeof id === "number"
	)
		return id as ResponseId;
	return undefined;
}

export function success(id: ResponseId, result: JsonObject): JsonObject {
	return withOptionalId(id, { ok: true, result });
}

export function failure(
	id: ResponseId,
	code: ErrorCode,
	message: string,
): JsonObject {
	return withOptionalId(id, { ok: false, error: { code, message } });
}

export function readDelivery(value: unknown): Delivery {
	if (value === undefined) return "auto";
	if (typeof value !== "string" || !DELIVERY_VALUES.has(value as Delivery)) {
		throw new RequestError(
			"bad_request",
			"delivery must be one of auto, immediate, steer, followUp",
		);
	}
	return value as Delivery;
}

export function readImages(value: unknown): ImageContent[] {
	if (value === undefined) return [];
	if (!Array.isArray(value))
		throw new RequestError("bad_request", "images must be an array");

	const images: ImageContent[] = [];
	let totalBytes = 0;

	for (const [index, imageValue] of value.entries()) {
		const image = requireObject(
			imageValue,
			`images[${index}] must be an object`,
		);
		const mimeType = image.mimeType;
		const data = image.data;

		if (typeof mimeType !== "string")
			throw new RequestError(
				"bad_request",
				`images[${index}].mimeType must be a string`,
			);
		if (!mimeType.startsWith("image/")) {
			throw new RequestError(
				"bad_request",
				`images[${index}].mimeType must start with image/`,
			);
		}
		if (typeof data !== "string")
			throw new RequestError(
				"bad_request",
				`images[${index}].data must be a base64 string`,
			);

		totalBytes += decodedBase64Bytes(data, `images[${index}].data`);
		if (totalBytes > MAX_IMAGE_PAYLOAD_BYTES) {
			throw new RequestError(
				"payload_too_large",
				`images exceed ${MAX_IMAGE_PAYLOAD_BYTES} bytes`,
			);
		}

		images.push({ type: "image", data, mimeType });
	}

	return images;
}

export function formatUnknownError(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

export function getErrorCode(error: unknown): string | undefined {
	if (!error || typeof error !== "object") return undefined;
	const code = (error as { code?: unknown }).code;
	return typeof code === "string" ? code : undefined;
}

function withOptionalId(id: ResponseId, response: JsonObject): JsonObject {
	if (id !== undefined) return { id, ...response };
	return response;
}

function decodedBase64Bytes(value: string, label: string): number {
	if (value.length === 0)
		throw new RequestError("bad_request", `${label} must not be empty`);
	if (value.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
		throw new RequestError("bad_request", `${label} must be valid base64`);
	}

	const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
	return Math.floor((value.length * 3) / 4) - padding;
}
