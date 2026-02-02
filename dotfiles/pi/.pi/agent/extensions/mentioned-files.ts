/**
 * Mentioned Files Extension
 *
 * Tracks files read by the agent since the last user message.
 * Use Alt+F or /files to select a file and open it in neovim.
 * Paths are shown relative to the current working directory.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as path from "node:path";

function toRelativePath(filePath: string, cwd: string): string {
	if (path.isAbsolute(filePath)) {
		const rel = path.relative(cwd, filePath);
		// If the relative path goes outside cwd, keep it relative anyway
		return rel || filePath;
	}
	return filePath;
}

export default function (pi: ExtensionAPI) {
	let mentionedFiles = new Set<string>();
	let cwd = "";

	// Handler for showing file list
	const showFileList = async (ctx: Parameters<Parameters<typeof pi.registerCommand>[1]["handler"]>[1]) => {
		if (mentionedFiles.size === 0) {
			ctx.ui.notify("No files mentioned yet", "info");
			return;
		}

		const files = [...mentionedFiles].sort();
		const selected = await ctx.ui.select("Select a file:", files);

		if (selected) {
			const result = await pi.exec("dev", ["tmux", "edit", selected]);
			ctx.ui.notify(
				result.code === 0 ? `Opened ${selected}` : `Error: ${result.stderr}`,
				result.code === 0 ? "info" : "error"
			);
		}
	};

	// Command to show and select from mentioned files
	pi.registerCommand("files", {
		description: "Show and select from mentioned files",
		handler: async (_args, ctx) => showFileList(ctx),
	});

	// Shortcut to show file list
	pi.registerShortcut("ctrl+f", {
		description: "Show and select from mentioned files",
		handler: async (ctx) => showFileList(ctx),
	});

	// Reset on new user prompt
	pi.on("agent_start", async (_event, ctx) => {
		mentionedFiles.clear();
		cwd = ctx.cwd;
	});

	// Collect paths from read tool calls
	pi.on("tool_call", async (event, ctx) => {
		if (!ctx.hasUI) return;

		if (event.toolName === "read") {
			const input = event.input as { path?: string };
			if (input?.path) {
				mentionedFiles.add(toRelativePath(input.path, cwd));
			}
		}
	});

	// Clear on session switch
	pi.on("session_switch", async (_event, ctx) => {
		mentionedFiles.clear();
	});

	// Clear on session start (handles resume)
	pi.on("session_start", async (_event, ctx) => {
		mentionedFiles.clear();
		cwd = ctx.cwd;
	});
}
