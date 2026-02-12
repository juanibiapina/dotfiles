/**
 * Todo TUI Extension - Local ticket tracking in markdown
 *
 * Provides a /todo command that launches a full-screen TUI for managing
 * tickets stored in TODO.md, matching the UX of juanibiapina/todo.
 *
 * Keybindings:
 *   List Panel:
 *     j/↓ k/↑    Navigate tickets
 *     g/G        First/last ticket
 *     a          Add new ticket
 *     d          Mark done (remove)
 *     K/J        Reorder up/down
 *     Space      Submit ticket to pi's editor
 *     Tab        Switch to detail panel
 *
 *   Detail Panel:
 *     j/↓ k/↑    Scroll description
 *     g/G        Top/bottom
 *     Tab        Switch to list panel
 *
 *   Global:
 *     ?          Show help
 *     q/Esc      Close TUI
 */

import { getSetting, type SettingDefinition } from "@juanibiapina/pi-extension-settings";
import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import {
	type Component,
	CURSOR_MARKER,
	type Focusable,
	Input,
	Key,
	type KeyId,
	Markdown,
	matchesKey,
	truncateToWidth,
	visibleWidth,
} from "@mariozechner/pi-tui";
import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// Types
// ============================================================================

interface Ticket {
	id: string;
	title: string;
	description: string;
}

interface ScrollState {
	cursor: number;
	offset: number;
	visibleRows: number;
}

type Panel = "list" | "detail";
type Modal = "none" | "add" | "help";

// ============================================================================
// File I/O
// ============================================================================

const TODO_FILENAME = "TODO.md";

function generateId(existingIds: Set<string>): string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let id: string;
	do {
		id = "";
		for (let i = 0; i < 3; i++) {
			id += chars[Math.floor(Math.random() * chars.length)];
		}
	} while (existingIds.has(id));
	return id;
}

function parseTickets(content: string): { header: string; tickets: Ticket[] } {
	const lines = content.split("\n");
	const tickets: Ticket[] = [];
	let header = "";
	let current: Ticket | null = null;
	let inFrontMatter = false;
	let fmCount = 0;
	let pastFM = false;
	let descLines: string[] = [];

	for (const line of lines) {
		// New ticket heading
		if (line.startsWith("## ")) {
			// Save previous ticket
			if (current) {
				if (pastFM && descLines.length > 0) {
					current.description = descLines.join("\n").trimEnd();
				}
				tickets.push(current);
			}

			current = {
				id: "",
				title: line.slice(3),
				description: "",
			};
			inFrontMatter = false;
			fmCount = 0;
			pastFM = false;
			descLines = [];
			continue;
		}

		// File header
		if (line.startsWith("# ") && !current) {
			header = line;
			continue;
		}

		if (!current) continue;

		// Front matter delimiters
		if (!pastFM && line === "---") {
			fmCount++;
			if (fmCount === 1) {
				inFrontMatter = true;
			} else if (fmCount === 2) {
				inFrontMatter = false;
				pastFM = true;
			}
			continue;
		}

		// Inside front matter
		if (inFrontMatter) {
			if (line.startsWith("id: ")) {
				current.id = line.slice(4);
			}
			continue;
		}

		// Description content
		if (pastFM) {
			descLines.push(line);
		}
	}

	// Save last ticket
	if (current) {
		if (pastFM && descLines.length > 0) {
			current.description = descLines.join("\n").trimEnd();
		}
		tickets.push(current);
	}

	return { header, tickets };
}

function serializeTickets(header: string, tickets: Ticket[]): string {
	let content = header ? header + "\n" : "# TODO\n";

	for (const ticket of tickets) {
		content += "\n";
		content += `## ${ticket.title}\n`;
		content += "---\n";
		content += `id: ${ticket.id}\n`;
		content += "---\n";
		if (ticket.description) {
			content += ticket.description + "\n";
		}
	}

	return content;
}

function ticketFullString(ticket: Ticket): string {
	let s = `## ${ticket.title}\n---\nid: ${ticket.id}\n---\n`;
	if (ticket.description) {
		s += ticket.description + "\n";
	}
	return s;
}

// ============================================================================
// Scroll State Helpers
// ============================================================================

function scrollUp(state: ScrollState): boolean {
	if (state.cursor <= 0) return false;
	state.cursor--;
	if (state.cursor < state.offset) {
		state.offset = state.cursor;
	}
	return true;
}

function scrollDown(state: ScrollState, itemCount: number): boolean {
	if (state.cursor >= itemCount - 1) return false;
	state.cursor++;
	if (state.visibleRows > 0 && state.cursor >= state.offset + state.visibleRows) {
		state.offset = state.cursor - state.visibleRows + 1;
	}
	return true;
}

function scrollFirst(state: ScrollState): void {
	state.cursor = 0;
	state.offset = 0;
}

function scrollLast(state: ScrollState, itemCount: number): void {
	if (itemCount <= 0) return;
	state.cursor = itemCount - 1;
	if (state.visibleRows > 0 && state.cursor >= state.visibleRows) {
		state.offset = state.cursor - state.visibleRows + 1;
	} else {
		state.offset = 0;
	}
}

function scrollVisibleRange(state: ScrollState, itemCount: number): [number, number] {
	let start = state.offset;
	let end = state.offset + state.visibleRows;
	if (end > itemCount) end = itemCount;
	if (start > end) start = end;
	return [start, end];
}

function scrollClamp(state: ScrollState, itemCount: number): void {
	if (state.cursor >= itemCount) state.cursor = itemCount - 1;
	if (state.cursor < 0) state.cursor = 0;
	if (state.offset > state.cursor) state.offset = state.cursor;
	if (state.offset < 0) state.offset = 0;
}

// ============================================================================
// Add Modal Component
// ============================================================================

class AddModal implements Component, Focusable {
	private input: Input;
	private theme: Theme;
	private width: number = 50;
	public onSubmit?: (title: string) => void;
	public onCancel?: () => void;

	// Focusable - propagate to input for IME
	private _focused = false;
	get focused(): boolean {
		return this._focused;
	}
	set focused(value: boolean) {
		this._focused = value;
		this.input.focused = value;
	}

	constructor(theme: Theme) {
		this.theme = theme;
		this.input = new Input();
		this.input.onSubmit = (value) => {
			if (value.trim() && this.onSubmit) {
				this.onSubmit(value.trim());
			}
		};
		this.input.onEscape = () => this.onCancel?.();
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.escape)) {
			this.onCancel?.();
			return;
		}
		this.input.handleInput(data);
	}

	invalidate(): void {
		this.input.invalidate();
	}

	render(width: number): string[] {
		const th = this.theme;
		const modalWidth = Math.min(this.width, width - 4);
		const innerWidth = modalWidth - 4; // padding

		const lines: string[] = [];

		// Top border
		const title = " Add Ticket ";
		const titleLen = visibleWidth(title);
		const borderLeft = Math.floor((modalWidth - 2 - titleLen) / 2);
		const borderRight = modalWidth - 2 - titleLen - borderLeft;
		lines.push(
			th.fg("accent", "╭" + "─".repeat(borderLeft)) +
				th.fg("accent", th.bold(title)) +
				th.fg("accent", "─".repeat(borderRight) + "╮"),
		);

		// Empty line
		lines.push(th.fg("accent", "│") + " ".repeat(modalWidth - 2) + th.fg("accent", "│"));

		// Input field
		const inputLines = this.input.render(innerWidth);
		for (const line of inputLines) {
			const lineWidth = visibleWidth(line);
			const padding = Math.max(0, innerWidth - lineWidth);
			lines.push(th.fg("accent", "│") + " " + line + " ".repeat(padding) + " " + th.fg("accent", "│"));
		}

		// Empty line
		lines.push(th.fg("accent", "│") + " ".repeat(modalWidth - 2) + th.fg("accent", "│"));

		// Help text
		const help = th.fg("dim", "enter: add • esc: cancel");
		const helpWidth = visibleWidth(help);
		const helpPadding = Math.max(0, innerWidth - helpWidth);
		lines.push(th.fg("accent", "│") + " " + help + " ".repeat(helpPadding) + " " + th.fg("accent", "│"));

		// Empty line
		lines.push(th.fg("accent", "│") + " ".repeat(modalWidth - 2) + th.fg("accent", "│"));

		// Bottom border
		lines.push(th.fg("accent", "╰" + "─".repeat(modalWidth - 2) + "╯"));

		// Center the modal
		const leftPad = Math.floor((width - modalWidth) / 2);
		return lines.map((line) => " ".repeat(leftPad) + line);
	}
}

// ============================================================================
// Help Modal Component
// ============================================================================

class HelpModal implements Component {
	private theme: Theme;
	public onClose?: () => void;

	constructor(theme: Theme) {
		this.theme = theme;
	}

	handleInput(data: string): void {
		if (matchesKey(data, Key.escape) || data === "?" || data === "q") {
			this.onClose?.();
		}
	}

	invalidate(): void {}

	render(width: number): string[] {
		const th = this.theme;
		const modalWidth = Math.min(50, width - 4);
		const innerWidth = modalWidth - 4;

		const lines: string[] = [];

		const renderKey = (key: string, desc: string) =>
			th.fg("accent", key) + " " + th.fg("text", desc);

		const sections = [
			th.fg("accent", th.bold("Ticket List")),
			"  " + renderKey("↑/k ↓/j", "move cursor"),
			"  " + renderKey("g/G", "first/last"),
			"  " + renderKey("a", "add ticket"),
			"  " + renderKey("d", "mark done (remove)"),
			"  " + renderKey("K/J", "reorder up/down"),
			"  " + renderKey("space", "submit to editor"),
			"",
			th.fg("accent", th.bold("Detail Panel")),
			"  " + renderKey("↑/k ↓/j", "scroll"),
			"  " + renderKey("g/G", "top/bottom"),
			"",
			th.fg("accent", th.bold("General")),
			"  " + renderKey("tab", "switch panel"),
			"  " + renderKey("?", "this help"),
			"  " + renderKey("esc/q", "close"),
		];

		// Title
		const title = " Keyboard Shortcuts ";
		const titleLen = visibleWidth(title);
		const borderLeft = Math.floor((modalWidth - 2 - titleLen) / 2);
		const borderRight = modalWidth - 2 - titleLen - borderLeft;
		lines.push(
			th.fg("accent", "╭" + "─".repeat(borderLeft)) +
				th.fg("accent", th.bold(title)) +
				th.fg("accent", "─".repeat(borderRight) + "╮"),
		);

		// Empty line
		lines.push(th.fg("accent", "│") + " ".repeat(modalWidth - 2) + th.fg("accent", "│"));

		// Content
		for (const section of sections) {
			const sectionWidth = visibleWidth(section);
			const padding = Math.max(0, innerWidth - sectionWidth);
			lines.push(th.fg("accent", "│") + " " + section + " ".repeat(padding) + " " + th.fg("accent", "│"));
		}

		// Empty line
		lines.push(th.fg("accent", "│") + " ".repeat(modalWidth - 2) + th.fg("accent", "│"));

		// Help text
		const help = th.fg("dim", "press esc or ? to close");
		const helpWidth = visibleWidth(help);
		const helpPadding = Math.max(0, innerWidth - helpWidth);
		lines.push(th.fg("accent", "│") + " " + help + " ".repeat(helpPadding) + " " + th.fg("accent", "│"));

		// Empty line
		lines.push(th.fg("accent", "│") + " ".repeat(modalWidth - 2) + th.fg("accent", "│"));

		// Bottom border
		lines.push(th.fg("accent", "╰" + "─".repeat(modalWidth - 2) + "╯"));

		// Center
		const leftPad = Math.floor((width - modalWidth) / 2);
		return lines.map((line) => " ".repeat(leftPad) + line);
	}
}

// ============================================================================
// Main TUI Component
// ============================================================================

class TodoTUI implements Component, Focusable {
	private cwd: string;
	private theme: Theme;
	private tui: { requestRender: () => void };

	private header: string = "";
	private tickets: Ticket[] = [];
	private listScroll: ScrollState = { cursor: 0, offset: 0, visibleRows: 10 };
	private detailScroll: ScrollState = { cursor: 0, offset: 0, visibleRows: 10 };

	private activePanel: Panel = "list";
	private modal: Modal = "none";
	private addModal: AddModal | null = null;
	private helpModal: HelpModal | null = null;

	private message: string = "";
	private messageIsError: boolean = false;
	private messageTime: number = 0;

	private cachedWidth: number = 0;
	private cachedHeight: number = 0;
	private cachedLines: string[] = [];
	private version: number = 0;
	private cachedVersion: number = -1;

	public onClose?: () => void;
	public onSubmitToEditor?: (text: string) => void;

	// Focusable - propagate to add modal when active
	private _focused = false;
	get focused(): boolean {
		return this._focused;
	}
	set focused(value: boolean) {
		this._focused = value;
		if (this.addModal) {
			this.addModal.focused = value;
		}
	}

	constructor(
		cwd: string,
		theme: Theme,
		tui: { requestRender: () => void },
	) {
		this.cwd = cwd;
		this.theme = theme;
		this.tui = tui;
		this.loadTickets();
	}

	private loadTickets(): void {
		const filePath = path.join(this.cwd, TODO_FILENAME);
		try {
			if (fs.existsSync(filePath)) {
				const content = fs.readFileSync(filePath, "utf-8");
				const parsed = parseTickets(content);
				this.header = parsed.header;
				this.tickets = parsed.tickets;
			} else {
				this.header = "# TODO";
				this.tickets = [];
			}
		} catch (err) {
			this.showMessage(`Error loading: ${err}`, true);
			this.tickets = [];
		}
		scrollClamp(this.listScroll, this.tickets.length);
		this.version++;
	}

	private saveTickets(): void {
		const filePath = path.join(this.cwd, TODO_FILENAME);
		try {
			const content = serializeTickets(this.header, this.tickets);
			fs.writeFileSync(filePath, content, "utf-8");
		} catch (err) {
			this.showMessage(`Error saving: ${err}`, true);
		}
	}

	private showMessage(msg: string, isError: boolean = false): void {
		this.message = msg;
		this.messageIsError = isError;
		this.messageTime = Date.now();
		this.version++;
	}

	private clearMessageIfOld(): void {
		if (this.message && Date.now() - this.messageTime > 3000) {
			this.message = "";
			this.version++;
		}
	}

	private getExistingIds(): Set<string> {
		return new Set(this.tickets.map((t) => t.id));
	}

	private addTicket(title: string): void {
		const ticket: Ticket = {
			id: generateId(this.getExistingIds()),
			title,
			description: "",
		};
		this.tickets.push(ticket);
		this.saveTickets();
		this.showMessage(`Added ${ticket.id}: ${ticket.title}`);
		// Move cursor to new ticket
		this.listScroll.cursor = this.tickets.length - 1;
		scrollClamp(this.listScroll, this.tickets.length);
	}

	private deleteTicket(): void {
		if (this.tickets.length === 0) return;
		const ticket = this.tickets[this.listScroll.cursor];
		this.tickets.splice(this.listScroll.cursor, 1);
		this.saveTickets();
		this.showMessage(`Completed: ${ticket.title}`);
		scrollClamp(this.listScroll, this.tickets.length);
	}

	private moveTicketUp(): void {
		const idx = this.listScroll.cursor;
		if (idx <= 0) return;
		[this.tickets[idx], this.tickets[idx - 1]] = [this.tickets[idx - 1], this.tickets[idx]];
		this.listScroll.cursor--;
		this.saveTickets();
		this.version++;
	}

	private moveTicketDown(): void {
		const idx = this.listScroll.cursor;
		if (idx >= this.tickets.length - 1) return;
		[this.tickets[idx], this.tickets[idx + 1]] = [this.tickets[idx + 1], this.tickets[idx]];
		this.listScroll.cursor++;
		this.saveTickets();
		this.version++;
	}

	private submitToEditor(): void {
		if (this.tickets.length === 0) return;
		const ticket = this.tickets[this.listScroll.cursor];
		this.onSubmitToEditor?.(ticketFullString(ticket));
	}

	handleInput(data: string): void {
		this.clearMessageIfOld();

		// Modal handling
		if (this.modal === "add" && this.addModal) {
			this.addModal.handleInput(data);
			this.tui.requestRender();
			return;
		}

		if (this.modal === "help" && this.helpModal) {
			this.helpModal.handleInput(data);
			this.tui.requestRender();
			return;
		}

		// Global keys
		if (matchesKey(data, Key.escape) || data === "q") {
			this.onClose?.();
			return;
		}

		if (data === "?") {
			this.modal = "help";
			this.helpModal = new HelpModal(this.theme);
			this.helpModal.onClose = () => {
				this.modal = "none";
				this.helpModal = null;
				this.version++;
			};
			this.version++;
			this.tui.requestRender();
			return;
		}

		if (matchesKey(data, Key.tab)) {
			this.activePanel = this.activePanel === "list" ? "detail" : "list";
			this.version++;
			this.tui.requestRender();
			return;
		}

		// Panel-specific keys
		if (this.activePanel === "list") {
			this.handleListInput(data);
		} else {
			this.handleDetailInput(data);
		}

		this.tui.requestRender();
	}

	private handleListInput(data: string): void {
		if (matchesKey(data, Key.up) || data === "k") {
			if (scrollUp(this.listScroll)) {
				this.detailScroll.cursor = 0;
				this.detailScroll.offset = 0;
				this.version++;
			}
			return;
		}

		if (matchesKey(data, Key.down) || data === "j") {
			if (scrollDown(this.listScroll, this.tickets.length)) {
				this.detailScroll.cursor = 0;
				this.detailScroll.offset = 0;
				this.version++;
			}
			return;
		}

		if (data === "g") {
			scrollFirst(this.listScroll);
			this.detailScroll.cursor = 0;
			this.detailScroll.offset = 0;
			this.version++;
			return;
		}

		if (data === "G") {
			scrollLast(this.listScroll, this.tickets.length);
			this.detailScroll.cursor = 0;
			this.detailScroll.offset = 0;
			this.version++;
			return;
		}

		if (data === "a") {
			this.modal = "add";
			this.addModal = new AddModal(this.theme);
			this.addModal.focused = this._focused;
			this.addModal.onSubmit = (title) => {
				this.addTicket(title);
				this.modal = "none";
				this.addModal = null;
			};
			this.addModal.onCancel = () => {
				this.modal = "none";
				this.addModal = null;
				this.version++;
			};
			this.version++;
			return;
		}

		if (data === "d") {
			this.deleteTicket();
			return;
		}

		if (data === "K") {
			this.moveTicketUp();
			return;
		}

		if (data === "J") {
			this.moveTicketDown();
			return;
		}

		if (matchesKey(data, Key.space) || data === " ") {
			this.submitToEditor();
			return;
		}
	}

	private handleDetailInput(data: string): void {
		if (matchesKey(data, Key.up) || data === "k") {
			if (this.detailScroll.cursor > 0) {
				this.detailScroll.cursor--;
				if (this.detailScroll.cursor < this.detailScroll.offset) {
					this.detailScroll.offset = this.detailScroll.cursor;
				}
				this.version++;
			}
			return;
		}

		if (matchesKey(data, Key.down) || data === "j") {
			this.detailScroll.cursor++;
			if (this.detailScroll.cursor >= this.detailScroll.offset + this.detailScroll.visibleRows) {
				this.detailScroll.offset = this.detailScroll.cursor - this.detailScroll.visibleRows + 1;
			}
			this.version++;
			return;
		}

		if (data === "g") {
			this.detailScroll.cursor = 0;
			this.detailScroll.offset = 0;
			this.version++;
			return;
		}

		if (data === "G") {
			// Will be clamped during render
			this.detailScroll.cursor = 99999;
			this.version++;
			return;
		}
	}

	invalidate(): void {
		this.cachedVersion = -1;
	}

	render(width: number): string[] {
		// Simple height estimation - assume standard terminal
		const height = 24;

		// Don't use cache when modal is open (input state changes without version bump)
		if (
			this.modal === "none" &&
			this.cachedLines.length > 0 &&
			this.cachedWidth === width &&
			this.cachedHeight === height &&
			this.cachedVersion === this.version
		) {
			return this.cachedLines;
		}

		const th = this.theme;
		const lines: string[] = [];

		// Layout calculations
		const totalHeight = height;
		const panelHeight = totalHeight - 2; // Leave room for status bar
		const listWidth = Math.min(Math.max(35, Math.floor(width * 0.4)), 60);
		const detailWidth = width - listWidth;

		this.listScroll.visibleRows = panelHeight - 3; // borders + padding
		this.detailScroll.visibleRows = panelHeight - 4;

		// Render panels
		const listPanel = this.renderListPanel(listWidth, panelHeight);
		const detailPanel = this.renderDetailPanel(detailWidth, panelHeight);

		// Combine panels horizontally
		for (let i = 0; i < panelHeight; i++) {
			const listLine = listPanel[i] || " ".repeat(listWidth);
			const detailLine = detailPanel[i] || " ".repeat(detailWidth);
			lines.push(listLine + detailLine);
		}

		// Status bar
		lines.push(...this.renderStatusBar(width));

		// Modal overlay
		if (this.modal === "add" && this.addModal) {
			const modalLines = this.addModal.render(width);
			const startRow = Math.floor((lines.length - modalLines.length) / 2);
			for (let i = 0; i < modalLines.length; i++) {
				const row = startRow + i;
				if (row >= 0 && row < lines.length) {
					lines[row] = this.overlayLine(lines[row], modalLines[i], width);
				}
			}
		}

		if (this.modal === "help" && this.helpModal) {
			const modalLines = this.helpModal.render(width);
			const startRow = Math.floor((lines.length - modalLines.length) / 2);
			for (let i = 0; i < modalLines.length; i++) {
				const row = startRow + i;
				if (row >= 0 && row < lines.length) {
					lines[row] = this.overlayLine(lines[row], modalLines[i], width);
				}
			}
		}

		this.cachedWidth = width;
		this.cachedHeight = height;
		this.cachedLines = lines;
		this.cachedVersion = this.version;

		return lines;
	}

	private overlayLine(bg: string, fg: string, width: number): string {
		// Simple overlay - just use fg line centered
		// Strip ANSI to find where content starts
		const fgStripped = fg.replace(/\x1b\[[0-9;]*m/g, "");
		const leadingSpaces = fgStripped.match(/^(\s*)/)?.[1]?.length || 0;

		if (leadingSpaces === 0) return fg;

		// Get bg content before the modal
		const bgStripped = bg.replace(/\x1b\[[0-9;]*m/g, "");
		const bgLeft = bgStripped.slice(0, leadingSpaces);

		// Reconstruct with bg left side + fg modal
		return bgLeft + fg.slice(leadingSpaces);
	}

	private renderListPanel(width: number, height: number): string[] {
		const th = this.theme;
		const lines: string[] = [];
		const innerWidth = width - 4;
		const isActive = this.activePanel === "list";
		const borderColor = isActive ? "accent" : "borderMuted";

		// Top border with title
		const num = th.fg(borderColor, "[1]");
		const title = th.fg(borderColor, isActive ? th.bold("Tickets") : "Tickets");
		const topBorder =
			th.fg(borderColor, "╭─") + num + th.fg(borderColor, "─") + title +
			th.fg(borderColor, "─".repeat(Math.max(0, width - 14)) + "╮");
		lines.push(topBorder);

		// Content area
		const contentHeight = height - 2;

		if (this.tickets.length === 0) {
			// Empty state
			const emptyMsg = "No tickets. Press 'a' to add one.";
			lines.push(
				th.fg(borderColor, "│") + " " +
				th.fg("dim", truncateToWidth(emptyMsg, innerWidth)) +
				" ".repeat(Math.max(0, innerWidth - visibleWidth(emptyMsg))) +
				" " + th.fg(borderColor, "│"),
			);
			for (let i = 1; i < contentHeight; i++) {
				lines.push(th.fg(borderColor, "│") + " ".repeat(width - 2) + th.fg(borderColor, "│"));
			}
		} else {
			const [start, end] = scrollVisibleRange(this.listScroll, this.tickets.length);
			let row = 0;

			for (let i = start; i < end && row < contentHeight; i++) {
				const ticket = this.tickets[i];
				const isSelected = i === this.listScroll.cursor;

				// Format: "aBc Title here..."
				const id = isSelected
					? th.bg("selectedBg", th.fg("accent", ticket.id))
					: th.fg("accent", ticket.id);

				const maxTitleLen = innerWidth - 5; // id(3) + spaces
				let titleText = ticket.title;
				if (titleText.length > maxTitleLen) {
					titleText = titleText.slice(0, maxTitleLen - 1) + "…";
				}

				const titleStyled = isSelected
					? th.bg("selectedBg", th.fg("text", titleText))
					: th.fg("text", titleText);

				let content: string;
				if (isSelected) {
					const lineContent = " " + id + " " + titleStyled;
					const contentWidth = visibleWidth(lineContent);
					const padding = Math.max(0, innerWidth - contentWidth + 2);
					content = th.bg("selectedBg", lineContent + " ".repeat(padding));
				} else {
					const lineContent = " " + id + " " + titleStyled;
					const contentWidth = visibleWidth(lineContent);
					const padding = Math.max(0, innerWidth - contentWidth + 2);
					content = lineContent + " ".repeat(padding);
				}

				lines.push(th.fg(borderColor, "│") + content + th.fg(borderColor, "│"));
				row++;
			}

			// Fill remaining rows
			for (; row < contentHeight; row++) {
				lines.push(th.fg(borderColor, "│") + " ".repeat(width - 2) + th.fg(borderColor, "│"));
			}
		}

		// Bottom border
		lines.push(th.fg(borderColor, "╰" + "─".repeat(width - 2) + "╯"));

		return lines;
	}

	private renderDetailPanel(width: number, height: number): string[] {
		const th = this.theme;
		const lines: string[] = [];
		const innerWidth = width - 4;
		const isActive = this.activePanel === "detail";
		const borderColor = isActive ? "accent" : "borderMuted";

		// Get current ticket
		const ticket = this.tickets[this.listScroll.cursor];

		// Top border with title
		const num = th.fg(borderColor, "[2]");
		let title = "Details";
		if (ticket) {
			title = `Details: ${ticket.id}`;
		}
		title = isActive ? th.bold(title) : title;
		const titleStyled = th.fg(borderColor, title);
		const topBorder =
			th.fg(borderColor, "╭─") + num + th.fg(borderColor, "─") + titleStyled +
			th.fg(borderColor, "─".repeat(Math.max(0, width - 12 - visibleWidth(title))) + "╮");
		lines.push(topBorder);

		// Content area
		const contentHeight = height - 2;

		if (!ticket) {
			const emptyMsg = "No ticket selected";
			lines.push(
				th.fg(borderColor, "│") + " " +
				th.fg("dim", emptyMsg) +
				" ".repeat(Math.max(0, innerWidth - visibleWidth(emptyMsg))) +
				" " + th.fg(borderColor, "│"),
			);
			for (let i = 1; i < contentHeight; i++) {
				lines.push(th.fg(borderColor, "│") + " ".repeat(width - 2) + th.fg(borderColor, "│"));
			}
		} else {
			// Build detail content
			const detailLines: string[] = [];

			// Title
			detailLines.push(th.fg("accent", th.bold(ticket.title)));
			detailLines.push("");

			// ID
			detailLines.push(th.fg("dim", "ID: ") + th.fg("accent", ticket.id));

			// Description
			if (ticket.description) {
				detailLines.push("");

				// Render markdown description
				const mdTheme = getMarkdownTheme();
				const md = new Markdown(ticket.description, 0, 0, mdTheme);
				const mdLines = md.render(innerWidth);
				detailLines.push(...mdLines);
			}

			// Clamp detail scroll
			const maxScroll = Math.max(0, detailLines.length - contentHeight);
			if (this.detailScroll.cursor > maxScroll) {
				this.detailScroll.cursor = maxScroll;
			}
			this.detailScroll.offset = this.detailScroll.cursor;

			// Render visible portion
			for (let i = 0; i < contentHeight; i++) {
				const lineIdx = this.detailScroll.offset + i;
				let content = detailLines[lineIdx] || "";
				const contentWidth = visibleWidth(content);
				if (contentWidth > innerWidth) {
					content = truncateToWidth(content, innerWidth);
				}
				const padding = Math.max(0, innerWidth - visibleWidth(content));
				lines.push(
					th.fg(borderColor, "│") + " " + content + " ".repeat(padding) + " " + th.fg(borderColor, "│"),
				);
			}
		}

		// Bottom border
		lines.push(th.fg(borderColor, "╰" + "─".repeat(width - 2) + "╯"));

		return lines;
	}

	private renderStatusBar(width: number): string[] {
		const th = this.theme;

		if (this.message) {
			const styledMsg = this.messageIsError
				? th.fg("error", th.bold(this.message))
				: th.fg("success", th.bold(this.message));
			const msgWidth = visibleWidth(styledMsg);
			const padding = Math.max(0, width - msgWidth - 2);
			return [" " + styledMsg + " ".repeat(padding) + " "];
		}

		const renderKey = (key: string, desc: string) =>
			th.fg("accent", key) + " " + th.fg("text", desc);

		let parts: string[];
		if (this.activePanel === "list") {
			parts = [
				renderKey("↑↓", "navigate"),
				renderKey("a", "add"),
				renderKey("d", "done"),
				renderKey("K/J", "reorder"),
				renderKey("space", "submit"),
				renderKey("tab", "detail"),
			];
		} else {
			parts = [
				renderKey("↑↓", "scroll"),
				renderKey("g/G", "top/bottom"),
				renderKey("tab", "list"),
			];
		}
		parts.push(renderKey("?", "help"), renderKey("q", "quit"));

		const content = parts.join(" ");
		const contentWidth = visibleWidth(content);
		const padding = Math.max(0, width - contentWidth - 2);

		return [" " + content + " ".repeat(padding) + " "];
	}
}

// ============================================================================
// Extension Entry Point
// ============================================================================

export default function (pi: ExtensionAPI) {
	// Register settings via event (for /extension-settings UI)
	pi.events.emit("pi-extension-settings:register", {
		name: "todo",
		settings: [
			{
				id: "shortcut",
				label: "Keyboard shortcut",
				description: "Shortcut to open todo TUI. Example: ctrl+t",
				defaultValue: "",
			},
		] satisfies SettingDefinition[],
	});

	async function openTodoTUI(ctx: ExtensionContext): Promise<void> {
		if (!ctx.hasUI) {
			ctx.ui.notify("/todo requires interactive mode", "error");
			return;
		}

		await ctx.ui.custom<void>((tui, theme, _kb, done) => {
			const todoTUI = new TodoTUI(ctx.cwd, theme, tui);

			todoTUI.onClose = () => done();
			todoTUI.onSubmitToEditor = (text) => {
				done();
				ctx.ui.setEditorText(text);
			};

			return todoTUI;
		});
	}

	pi.registerCommand("todo", {
		description: "Open ticket TUI (TODO.md)",
		handler: async (_args, ctx) => {
			await openTodoTUI(ctx);
		},
	});

	// Register shortcut if configured
	const shortcut = getSetting("todo", "shortcut");
	if (shortcut) {
		pi.registerShortcut(shortcut as KeyId, {
			description: "Open todo TUI",
			handler: async (ctx) => {
				await openTodoTUI(ctx);
			},
		});
	}
}
