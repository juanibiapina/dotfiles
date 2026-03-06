/**
 * Rewind extension - quick recap using the last message as summary
 *
 * Commands:
 *   /rewind - Navigate back to the last recap point (or session start),
 *             using the last message as the branch summary instead of
 *             generating one with the LLM.
 *
 * This is a fast, zero-cost alternative to /recap. Compatible with recap's
 * anchor system (uses the same "recap" label).
 *
 * Usage:
 *   /rewind
 */

import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	let pendingRewindSummary: string | null = null;

	// Intercept tree navigation to provide the last message as summary
	pi.on("session_before_tree", async (_event, _ctx) => {
		if (pendingRewindSummary !== null) {
			const summary = pendingRewindSummary;
			pendingRewindSummary = null;
			return { summary: { summary, details: {} } };
		}
	});

	pi.registerCommand("rewind", {
		description: "Navigate back to last recap point using last message as summary",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("rewind requires interactive mode", "error");
				return;
			}

			// Find anchor: last recap marker or first entry
			const branch = ctx.sessionManager.getBranch();
			let anchorId: string | undefined;

			for (const entry of branch) {
				const label = ctx.sessionManager.getLabel(entry.id);
				if (label === "recap") {
					anchorId = entry.id;
				}
			}

			// Fall back to first entry
			if (!anchorId) {
				anchorId = branch[0]?.id;
			}

			if (!anchorId) {
				ctx.ui.notify("No conversation to rewind", "error");
				return;
			}

			// Find the last message (user or assistant) after the anchor
			const anchorIndex = branch.findIndex((e) => e.id === anchorId);
			const entriesAfterAnchor = branch.slice(anchorIndex + 1);
			const messageEntries = entriesAfterAnchor
				.filter((entry): entry is SessionEntry & { type: "message" } =>
					entry.type === "message" &&
					(entry.message.role === "user" || entry.message.role === "assistant"),
				);

			if (messageEntries.length === 0) {
				ctx.ui.notify("No messages to rewind", "error");
				return;
			}

			const lastMessage = messageEntries[messageEntries.length - 1].message;

			// Extract text content from the message
			let text: string;
			if (typeof lastMessage.content === "string") {
				text = lastMessage.content;
			} else {
				text = lastMessage.content
					.filter((c): c is { type: "text"; text: string } => c.type === "text")
					.map((c) => c.text)
					.join("\n");
			}

			if (!text.trim()) {
				ctx.ui.notify("Last message has no text content", "error");
				return;
			}

			// Store summary for session_before_tree handler
			pendingRewindSummary = text;

			// Navigate tree back to anchor with the last message as summary
			const navResult = await ctx.navigateTree(anchorId, {
				summarize: true,
				label: "recap",
			});

			if (navResult.cancelled) {
				pendingRewindSummary = null;
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			ctx.ui.notify("Rewind complete. Ready for next task.", "info");
		},
	});
}
