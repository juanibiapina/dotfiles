/**
 * Undo extension - navigate back to undo the last user message
 *
 * Commands:
 *   /undo - Navigate to the parent of the last user message, dropping
 *           both the user message and the assistant response. Pre-fills
 *           the editor with the undone message text.
 *
 * Usage:
 *   /undo
 */

import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("undo", {
		description: "Undo last user message and pre-fill editor with its text",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("undo requires interactive mode", "error");
				return;
			}

			const branch = ctx.sessionManager.getBranch();

			// Find the last user message entry
			let lastUserEntry: (SessionEntry & { type: "message" }) | undefined;
			for (const entry of branch) {
				if (
					entry.type === "message" &&
					entry.message.role === "user"
				) {
					lastUserEntry = entry as SessionEntry & { type: "message" };
				}
			}

			if (!lastUserEntry) {
				ctx.ui.notify("No user messages to undo", "error");
				return;
			}

			if (lastUserEntry.parentId === null) {
				ctx.ui.notify("Nothing to undo — already at session start", "error");
				return;
			}

			// Extract text content from the user message
			const content = lastUserEntry.message.content;
			let text: string;
			if (typeof content === "string") {
				text = content;
			} else {
				text = content
					.filter((c): c is { type: "text"; text: string } => c.type === "text")
					.map((c) => c.text)
					.join("\n");
			}

			// Navigate to the parent (drops the user message and everything after it)
			const navResult = await ctx.navigateTree(lastUserEntry.parentId, {
				summarize: false,
			});

			if (navResult.cancelled) {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			// Pre-fill the editor with the undone message text
			if (text.trim()) {
				ctx.ui.setEditorText(text);
			}
		},
	});
}
