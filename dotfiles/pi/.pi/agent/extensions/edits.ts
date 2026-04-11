import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import {
	getLanguageFromPath,
	highlightCode,
	type ExtensionAPI,
	type ExtensionCommandContext,
	type ExtensionContext,
	type Theme,
} from "@mariozechner/pi-coding-agent";
import type { OverlayHandle, TUI } from "@mariozechner/pi-tui";
import {
	matchesKey,
	truncateToWidth,
	visibleWidth,
} from "@mariozechner/pi-tui";

interface EditItem {
	toolCallId: string;
	toolName: "edit" | "write";
	path: string;
	status: "pending" | "success" | "error";
	diff?: string;
	error?: string;
	timestamp: number;
}

interface WriteSnapshot {
	path: string;
	previousContent?: string;
}

interface EditStore {
	items: EditItem[];
	itemsByToolCallId: Map<string, EditItem>;
	writeSnapshots: Map<string, WriteSnapshot>;
	activeOverlayHandle: OverlayHandle | null;
	activeComponent: EditOverlayComponent | null;
	requestRender: (() => void) | null;
}

const DEFAULT_OVERLAY_WIDTH = "96%";
const MAX_DIFF_LINES = 12;
const TAB_WIDTH = 4;

function resolveToolPath(cwd: string, filePath: string): string {
	return isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
}

function getToolPath(input: unknown): string | undefined {
	if (!input || typeof input !== "object") return undefined;
	const value = (input as Record<string, unknown>).path;
	return typeof value === "string" && value.trim() ? value : undefined;
}

function getMessageText(content: unknown): string {
	if (!Array.isArray(content)) return "";
	return content
		.filter(
			(block): block is { type: string; text?: string } =>
				!!block && typeof block === "object",
		)
		.map((block) =>
			block.type === "text" && typeof block.text === "string" ? block.text : "",
		)
		.join("\n")
		.trim();
}

function getDetailsRecord(details: unknown): Record<string, unknown> {
	return details && typeof details === "object"
		? { ...(details as Record<string, unknown>) }
		: {};
}

function getEditDiffFromDetails(details: unknown): string | undefined {
	const diff = getDetailsRecord(details).diff;
	return typeof diff === "string" && diff.trim() ? diff : undefined;
}

function getWritePathFromDetails(details: unknown): string | undefined {
	const path = getDetailsRecord(details).path;
	return typeof path === "string" && path.trim() ? path : undefined;
}

function ensureItem(
	store: EditStore,
	toolCallId: string,
	toolName: "edit" | "write",
	path: string,
	timestamp: number,
) {
	const existing = store.itemsByToolCallId.get(toolCallId);
	if (existing) {
		if (path) existing.path = path;
		return existing;
	}

	const item: EditItem = {
		toolCallId,
		toolName,
		path,
		status: "pending",
		timestamp,
	};
	store.items.push(item);
	store.itemsByToolCallId.set(toolCallId, item);
	return item;
}

function rebuildStore(store: EditStore, ctx: ExtensionContext): void {
	store.items = [];
	store.itemsByToolCallId = new Map();
	store.writeSnapshots.clear();

	for (const entry of ctx.sessionManager.getBranch()) {
		if (entry.type !== "message") continue;
		const message = entry.message;

		if (message.role === "assistant" && Array.isArray(message.content)) {
			for (const block of message.content) {
				if (!block || typeof block !== "object" || block.type !== "toolCall")
					continue;
				const toolName = block.name;
				if (toolName !== "edit" && toolName !== "write") continue;
				const path = getToolPath(block.arguments) || "(unknown path)";
				ensureItem(store, block.id, toolName, path, message.timestamp);
			}
		}

		if (
			message.role === "toolResult" &&
			(message.toolName === "edit" || message.toolName === "write")
		) {
			const item = ensureItem(
				store,
				message.toolCallId,
				message.toolName,
				(message.toolName === "write"
					? getWritePathFromDetails(message.details)
					: undefined) ||
					store.itemsByToolCallId.get(message.toolCallId)?.path ||
					"(unknown path)",
				message.timestamp,
			);
			item.status = message.isError ? "error" : "success";
			item.diff = getEditDiffFromDetails(message.details);
			item.error = message.isError
				? getMessageText(message.content) || "Tool failed"
				: undefined;
			if (message.toolName === "write") {
				const detailPath = getWritePathFromDetails(message.details);
				if (detailPath) item.path = detailPath;
			}
		}
	}
}

function invalidateOverlay(store: EditStore): void {
	store.activeComponent?.invalidate();
	store.requestRender?.();
}

function readPreviousContent(path: string): string | undefined {
	if (!existsSync(path)) return undefined;
	return readFileSync(path, "utf8");
}

async function generateWriteDiff(
	pi: ExtensionAPI,
	path: string,
	before: string | undefined,
	after: string,
): Promise<string | undefined> {
	if (before === after) return undefined;

	const dir = mkdtempSync(join(tmpdir(), "pi-edits-"));
	const beforePath = join(dir, "before.txt");
	const afterPath = join(dir, "after.txt");

	try {
		writeFileSync(beforePath, before ?? "", "utf8");
		writeFileSync(afterPath, after, "utf8");

		const { stdout, stderr, code } = await pi.exec("git", [
			"--no-pager",
			"diff",
			"--no-index",
			"--no-color",
			"--",
			beforePath,
			afterPath,
		]);

		if (code !== 0 && code !== 1) {
			console.error(`edits: git diff failed for ${path}: ${stderr || stdout}`);
			return undefined;
		}

		const diff = stdout
			.replaceAll(beforePath, `a/${path}`)
			.replaceAll(afterPath, `b/${path}`)
			.trim();
		return diff || undefined;
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

class EditOverlayComponent {
	private selectedIndex = 0;
	private listScrollOffset = 0;
	private diffScrollOffset = 0;
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(
		private tui: TUI,
		private theme: Theme,
		private store: EditStore,
		private onClose: () => void,
	) {
		this.selectedIndex = Math.max(0, this.store.items.length - 1);
		this.listScrollOffset = Math.max(0, this.selectedIndex - 1);
		this.diffScrollOffset = 0;
	}

	handleInput(data: string): void {
		if (
			matchesKey(data, "escape") ||
			matchesKey(data, "ctrl+c") ||
			data === "q"
		) {
			this.onClose();
			return;
		}

		if (matchesKey(data, "up") || data === "k") {
			this.selectedIndex = Math.max(0, this.selectedIndex - 1);
			this.diffScrollOffset = 0;
			this.invalidate();
			this.tui.requestRender();
			return;
		}

		if (matchesKey(data, "down") || data === "j") {
			this.selectedIndex = Math.min(
				this.store.items.length - 1,
				this.selectedIndex + 1,
			);
			this.diffScrollOffset = 0;
			this.invalidate();
			this.tui.requestRender();
			return;
		}

		const diffScrollStep = 3;
		const diffPageStep = Math.max(
			1,
			Math.floor((this.tui.terminal.rows - 8) / 2),
		);

		if (data === "J") {
			this.diffScrollOffset += diffScrollStep;
			this.invalidate();
			this.tui.requestRender();
			return;
		}

		if (data === "K") {
			this.diffScrollOffset = Math.max(
				0,
				this.diffScrollOffset - diffScrollStep,
			);
			this.invalidate();
			this.tui.requestRender();
			return;
		}

		if (matchesKey(data, "pagedown") || matchesKey(data, "ctrl+d")) {
			this.diffScrollOffset += diffPageStep;
			this.invalidate();
			this.tui.requestRender();
			return;
		}

		if (matchesKey(data, "pageup") || matchesKey(data, "ctrl+u")) {
			this.diffScrollOffset = Math.max(0, this.diffScrollOffset - diffPageStep);
			this.invalidate();
			this.tui.requestRender();
		}
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const lines: string[] = [];
		const th = this.theme;
		const w = Math.max(40, width);
		const innerW = w - 2;
		const row = (content = "") =>
			th.fg("border", "│") + padAnsi(content, innerW) + th.fg("border", "│");
		const items = this.store.items;
		this.selectedIndex = clamp(
			this.selectedIndex,
			0,
			Math.max(0, items.length - 1),
		);

		lines.push(th.fg("border", `╭${"─".repeat(innerW)}╮`));
		lines.push(
			row(
				` ${th.bold(th.fg("accent", "File edits"))} ${th.fg("dim", `(${items.length})`)}`,
			),
		);
		lines.push(
			row(
				` ${th.fg("dim", "↑↓/j k select • PgUp/PgDn Ctrl+U/Ctrl+D Shift+J/K scroll diff • Esc close")}`,
			),
		);
		lines.push(row());

		if (items.length === 0) {
			lines.push(
				row(
					` ${th.fg("dim", "No edit or write tool calls in this branch yet.")}`,
				),
			);
			lines.push(row());
			lines.push(th.fg("border", `╰${"─".repeat(innerW)}╯`));
			this.cachedWidth = width;
			this.cachedLines = lines;
			return lines;
		}

		const paneGap = 3;
		const listWidth = clamp(Math.floor(innerW * 0.34), 20, 32);
		const diffWidth = Math.max(20, innerW - listWidth - paneGap);
		const selectedItem = items[this.selectedIndex];
		const availableBodyHeight = Math.max(8, this.tui.terminal.rows - 8);
		const diffLines = renderDiffPane(
			selectedItem,
			this.diffScrollOffset,
			th,
			diffWidth,
			availableBodyHeight,
		);
		const listLines = renderListPane(
			items,
			this.selectedIndex,
			this.listScrollOffset,
			th,
			listWidth,
			availableBodyHeight,
		);
		this.listScrollOffset = listLines.nextScrollOffset;
		this.diffScrollOffset = diffLines.nextScrollOffset;
		const bodyHeight = availableBodyHeight;

		for (let index = 0; index < bodyHeight; index++) {
			const left = listLines.lines[index] || "";
			const right = diffLines.lines[index] || "";
			const divider = th.fg("borderMuted", " │ ");
			lines.push(
				row(
					`${padAnsi(left, listWidth)}${divider}${padAnsi(right, diffWidth)}`,
				),
			);
		}

		lines.push(th.fg("border", `╰${"─".repeat(innerW)}╯`));
		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}

	focusLatest(): void {
		this.selectedIndex = Math.max(0, this.store.items.length - 1);
		this.listScrollOffset = Math.max(0, this.selectedIndex - 1);
		this.diffScrollOffset = 0;
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}
}

function renderStatus(theme: Theme, status: EditItem["status"]): string {
	switch (status) {
		case "success":
			return theme.fg("success", "✓");
		case "error":
			return theme.fg("error", "✗");
		default:
			return theme.fg("warning", "●");
	}
}

function normalizeDisplayLine(line: string): string {
	return line.replaceAll("\t", " ".repeat(TAB_WIDTH));
}

function renderListPane(
	items: EditItem[],
	selectedIndex: number,
	scrollOffset: number,
	theme: Theme,
	width: number,
	height: number,
): { lines: string[]; nextScrollOffset: number } {
	const lines: string[] = [];
	const headerLines = 0;
	const footerLines = 1;
	const itemHeight = 1;
	const visibleItems = Math.max(
		1,
		Math.floor((height - headerLines - footerLines) / itemHeight),
	);
	const maxScrollOffset = Math.max(0, items.length - visibleItems);
	const nextScrollOffset = clamp(
		Math.min(scrollOffset, selectedIndex),
		Math.max(0, selectedIndex - visibleItems + 1),
		maxScrollOffset,
	);
	const start = nextScrollOffset;
	const end = Math.min(items.length, start + visibleItems);

	for (let index = start; index < end; index++) {
		const item = items[index];
		if (!item) continue;
		const selected = index === selectedIndex;
		const prefix = selected ? theme.fg("accent", "▶") : theme.fg("dim", "•");
		const status = renderStatus(theme, item.status);
		const label = theme.fg("muted", `[${item.toolName}]`);
		const path = selected
			? theme.fg("accent", item.path)
			: theme.fg("text", item.path);
		lines.push(truncateToWidth(`${prefix} ${status} ${label} ${path}`, width));
	}

	while (lines.length < Math.max(headerLines, height - footerLines)) {
		lines.push("");
	}

	const before = start;
	const after = Math.max(0, items.length - end);
	let footer = "";
	if (before > 0 && after > 0) footer = `↑ ${before} earlier • ↓ ${after} more`;
	else if (before > 0) footer = `↑ ${before} earlier`;
	else if (after > 0) footer = `↓ ${after} more`;
	lines.push(truncateToWidth(theme.fg("dim", footer), width));

	return { lines: lines.slice(0, height), nextScrollOffset };
}

function renderDiffPane(
	item: EditItem | undefined,
	scrollOffset: number,
	theme: Theme,
	width: number,
	height: number,
): { lines: string[]; nextScrollOffset: number } {
	const lines: string[] = [];
	const body: string[] = [];
	if (!item) {
		lines.push(truncateToWidth(theme.fg("dim", "No edit selected"), width));
		while (lines.length < height) lines.push("");
		return { lines: lines.slice(0, height), nextScrollOffset: 0 };
	}

	const title = `${item.toolName} ${item.path}`;
	body.push(truncateToWidth(theme.fg("accent", title), width));
	body.push("");
	body.push(...renderItemDetails(item, theme, width));

	const visibleBodyLines = Math.max(1, height - 1);
	const maxScrollOffset = Math.max(0, body.length - visibleBodyLines);
	const nextScrollOffset = clamp(scrollOffset, 0, maxScrollOffset);
	const visibleBody = body.slice(
		nextScrollOffset,
		nextScrollOffset + visibleBodyLines,
	);
	const before = nextScrollOffset;
	const after = Math.max(
		0,
		body.length - (nextScrollOffset + visibleBody.length),
	);
	const footer =
		before > 0 || after > 0
			? truncateToWidth(
					theme.fg("dim", `↑ ${before} hidden • ↓ ${after} hidden`),
					width,
				)
			: "";
	const output = [...lines, ...visibleBody, footer];
	while (output.length < height) output.push("");

	return { lines: output.slice(0, height), nextScrollOffset };
}

function renderItemDetails(
	item: EditItem,
	theme: Theme,
	width: number,
): string[] {
	if (item.status === "pending") {
		return [
			truncateToWidth(theme.fg("warning", "Waiting for tool result..."), width),
		];
	}

	if (item.status === "error") {
		return splitLines(item.error || "Tool failed", width).map((line) =>
			theme.fg("error", line),
		);
	}

	if (!item.diff) {
		return [truncateToWidth(theme.fg("dim", "No diff available"), width)];
	}

	const lang = getLanguageFromPath(item.path);
	const diffLines = item.diff.split(/\r?\n/);
	return diffLines.map((line) => renderDiffLine(theme, line || " ", width, lang));
}

function renderDiffLine(
	theme: Theme,
	line: string,
	width: number,
	lang?: string,
): string {
	const normalizedLine = normalizeDisplayLine(line);
	if (normalizedLine.startsWith("@@")) {
		return truncateToWidth(theme.fg("accent", normalizedLine), width);
	}
	if (
		normalizedLine.startsWith("diff --git") ||
		normalizedLine.startsWith("index ") ||
		normalizedLine.startsWith("--- ") ||
		normalizedLine.startsWith("+++ ")
	) {
		return truncateToWidth(theme.fg("dim", normalizedLine), width);
	}
	if (normalizedLine.startsWith("\\")) {
		return truncateToWidth(theme.fg("dim", normalizedLine), width);
	}

	const prefix = getDiffCodePrefix(normalizedLine);
	if (prefix === null) {
		return truncateToWidth(theme.fg("text", normalizedLine), width);
	}

	const code = normalizedLine.slice(prefix.length);
	const highlightedCode = highlightDiffCode(code, lang);
	const highlightedPrefix = colorizeDiffPrefix(theme, prefix);
	const renderedLine = truncateToWidth(
		`${highlightedPrefix}${highlightedCode}`,
		width,
	);
	return applyDiffLineBackground(theme, prefix, renderedLine, width);
}

function getDiffCodePrefix(line: string): string | null {
	if (!line) return null;
	if (line.startsWith("+") || line.startsWith("-")) return line[0] ?? null;
	if (line.startsWith(" ")) return " ";
	return null;
}

function highlightDiffCode(code: string, lang?: string): string {
	if (!code) return "";
	return highlightCode(code, lang)[0] ?? code;
}

function colorizeDiffPrefix(theme: Theme, prefix: string): string {
	if (prefix === "+") return theme.fg("success", prefix);
	if (prefix === "-") return theme.fg("error", prefix);
	return theme.fg("text", prefix);
}

function applyDiffLineBackground(
	_theme: Theme,
	prefix: string,
	line: string,
	width: number,
): string {
	const paddedLine = padAnsi(line, width);
	if (prefix === "+") {
		return applyPersistentBackground(getDiffBackgroundStart(prefix), paddedLine);
	}
	if (prefix === "-") {
		return applyPersistentBackground(getDiffBackgroundStart(prefix), paddedLine);
	}
	return paddedLine;
}

function getDiffBackgroundStart(prefix: "+" | "-"): string {
	if (prefix === "+") return "\x1b[48;2;18;44;24m";
	return "\x1b[48;2;56;24;24m";
}

function applyPersistentBackground(start: string, text: string): string {
	const withReappliedBackground = text.replaceAll(/\x1b\[(?:0|49)m/g, (match) => {
		return `${match}${start}`;
	});
	return `${start}${withReappliedBackground}\x1b[49m`;
}

function splitLines(text: string, width: number): string[] {
	return text
		.split(/\r?\n/)
		.flatMap((line) => {
			const normalized = normalizeDisplayLine(line);
			if (!normalized) return [""];
			const parts: string[] = [];
			let rest = normalized;
			while (visibleWidth(rest) > width && width > 0) {
				const chunk = truncateToWidth(rest, width, "");
				parts.push(chunk);
				rest = rest.slice(chunk.length);
			}
			parts.push(rest);
			return parts;
		})
		.slice(0, MAX_DIFF_LINES);
}

function padAnsi(text: string, width: number): string {
	const truncated = truncateToWidth(text, width, "");
	return truncated + " ".repeat(Math.max(0, width - visibleWidth(truncated)));
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export default function (pi: ExtensionAPI) {
	const store: EditStore = {
		items: [],
		itemsByToolCallId: new Map(),
		writeSnapshots: new Map(),
		activeOverlayHandle: null,
		activeComponent: null,
		requestRender: null,
	};

	const refreshOverlay = () => {
		invalidateOverlay(store);
	};

	const showEditsOverlay = async (ctx: ExtensionCommandContext) => {
		rebuildStore(store, ctx);
		await ctx.ui.custom<void>(
			(tui, theme, _kb, done) => {
				const close = () => done(undefined);
				const component = new EditOverlayComponent(tui, theme, store, close);
				store.activeComponent = component;
				store.requestRender = () => tui.requestRender();
				return component;
			},
			{
				overlay: true,
				overlayOptions: {
					anchor: "center",
					width: DEFAULT_OVERLAY_WIDTH,
					maxHeight: "94%",
					margin: 1,
				},
				onHandle: (handle) => {
					store.activeOverlayHandle = handle;
				},
			},
		);
		store.activeOverlayHandle = null;
		store.activeComponent = null;
		store.requestRender = null;
	};

	pi.registerCommand("edits", {
		description: "Show live file edits for edit and write tool calls",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			await showEditsOverlay(ctx);
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		rebuildStore(store, ctx);
		invalidateOverlay(store);
	});

	pi.on("session_tree", async (_event, ctx) => {
		rebuildStore(store, ctx);
		invalidateOverlay(store);
	});

	pi.on("session_shutdown", async () => {
		store.writeSnapshots.clear();
		store.activeOverlayHandle = null;
		store.activeComponent = null;
		store.requestRender = null;
	});

	pi.on("message_end", async (event) => {
		const message = event.message;
		if (message.role !== "assistant" || !Array.isArray(message.content)) return;

		let added = false;
		for (const block of message.content) {
			if (!block || typeof block !== "object" || block.type !== "toolCall")
				continue;
			const toolName = block.name;
			if (toolName !== "edit" && toolName !== "write") continue;
			const path = getToolPath(block.arguments) || "(unknown path)";
			if (!store.itemsByToolCallId.has(block.id)) added = true;
			ensureItem(store, block.id, toolName, path, message.timestamp);
		}

		if (added) refreshOverlay();
	});

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "write") return;
		const path = getToolPath(event.input);
		if (!path) return;
		const resolvedPath = resolveToolPath(ctx.cwd, path);
		store.writeSnapshots.set(event.toolCallId, {
			path,
			previousContent: readPreviousContent(resolvedPath),
		});
	});

	pi.on("tool_result", async (event, ctx) => {
		if (event.toolName !== "edit" && event.toolName !== "write") return;

		const inputPath = getToolPath(event.input);
		const snapshot = store.writeSnapshots.get(event.toolCallId);
		const mergedDetails = getDetailsRecord(event.details);

		if (
			event.toolName === "write" &&
			!event.isError &&
			!getEditDiffFromDetails(mergedDetails) &&
			inputPath
		) {
			const resolvedPath = resolveToolPath(ctx.cwd, inputPath);
			const after = readFileSync(resolvedPath, "utf8");
			const diff = await generateWriteDiff(
				pi,
				inputPath,
				snapshot?.previousContent,
				after,
			);
			if (diff) mergedDetails.diff = diff;
			if (!mergedDetails.path && (snapshot?.path || inputPath)) {
				mergedDetails.path = snapshot?.path || inputPath;
			}
		}

		const path =
			(event.toolName === "write"
				? getWritePathFromDetails(mergedDetails) || snapshot?.path || inputPath
				: inputPath) || "(unknown path)";
		const item = ensureItem(
			store,
			event.toolCallId,
			event.toolName,
			path,
			Date.now(),
		);
		if (event.toolName === "write") item.path = path;
		item.status = event.isError ? "error" : "success";
		item.diff = getEditDiffFromDetails(mergedDetails);
		item.error = event.isError
			? getMessageText(event.content) || "Tool failed"
			: undefined;
		refreshOverlay();
		store.writeSnapshots.delete(event.toolCallId);

		if (event.toolName === "write") {
			return { details: mergedDetails };
		}
	});
}
