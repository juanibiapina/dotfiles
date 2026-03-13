/**
 * Branch extension - manage conversation branches
 *
 * Commands:
 *   /branch:fold  - Summarize conversation (LLM-generated) and navigate back to the last fold point
 *   /branch:prune - Navigate back to the last fold point using the last message as summary
 *   /branch:drop  - Navigate back to the last fold point, discarding the branch with no summary
 *   /branch:tag   - Mark current position as a fold anchor (future folds only summarize after this point)
 *   /branch:undo  - Drop the last exchange and pre-fill the editor with the undone message
 *
 * Fold and prune create branch summaries that persist in the session tree.
 * Drop discards the branch without creating a summary.
 * Undo is a lightweight single-exchange rollback.
 */

import { complete, type Message } from "@mariozechner/pi-ai";
import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";
import { convertToLlm, serializeConversation } from "@mariozechner/pi-coding-agent";

const FOLD_SYSTEM_PROMPT = `You are a context summarization assistant. Given a conversation history, generate a concise summary that captures:

1. Relevant context from the conversation (decisions made, approaches taken, key findings)
2. Any relevant files that were discussed or modified
3. Current state of the work (what's done, what's pending, any blockers)

Format your response as a summary that provides enough context to continue working. Be concise but include all necessary context. Do not include any preamble like "Here's the summary" - just output the summary itself.

Example output format:
## Context
We've been working on X. Key decisions:
- Decision 1
- Decision 2

## Files
- path/to/file1.ts - description of changes
- path/to/file2.ts - description of changes

## Current State
[What's been accomplished and what remains]`;

/**
 * Find the fold anchor: the last entry labeled "fold", or the first entry in the branch.
 * Returns undefined if the branch is empty.
 */
function findFoldAnchor(branch: SessionEntry[], sessionManager: { getLabel(id: string): string | undefined }): string | undefined {
	let anchorId: string | undefined;

	for (const entry of branch) {
		const label = sessionManager.getLabel(entry.id);
		if (label === "fold") {
			anchorId = entry.id;
		}
	}

	// Fall back to first entry
	if (!anchorId) {
		anchorId = branch[0]?.id;
	}

	return anchorId;
}

export default function (pi: ExtensionAPI) {
	let pendingSummary: string | null = null;

	// Intercept tree navigation to provide custom summary when folding or pruning
	pi.on("session_before_tree", async (_event, _ctx) => {
		if (pendingSummary !== null) {
			const summary = pendingSummary;
			pendingSummary = null;
			return { summary: { summary, details: {} } };
		}
	});

	pi.registerCommand("branch:fold", {
		description: "Summarize conversation and roll back to a clean starting point",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("branch:fold requires interactive mode", "error");
				return;
			}

			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
				return;
			}

			// Find anchor: last fold marker or first entry
			const branch = ctx.sessionManager.getBranch();
			const anchorId = findFoldAnchor(branch, ctx.sessionManager);

			if (!anchorId) {
				ctx.ui.notify("No conversation to fold", "error");
				return;
			}

			// Gather messages after anchor for summarization
			const anchorIndex = branch.findIndex((e) => e.id === anchorId);
			const entriesAfterAnchor = branch.slice(anchorIndex + 1);
			const messages: Parameters<typeof convertToLlm>[0] = [];
			for (const entry of entriesAfterAnchor) {
				if (entry.type === "message") {
					messages.push(entry.message);
				} else if (entry.type === "branch_summary") {
					// Include prune summaries (unlabeled) but skip fold summaries (labeled "fold")
					const label = ctx.sessionManager.getLabel(entry.id);
					if (label !== "fold") {
						messages.push({
							role: "branchSummary" as const,
							summary: entry.summary,
							fromId: entry.fromId,
							timestamp: Date.parse(entry.timestamp),
						});
					}
				}
			}

			if (messages.length === 0) {
				ctx.ui.notify("No conversation to fold", "error");
				return;
			}

			// Convert to LLM format and serialize
			const llmMessages = convertToLlm(messages);
			const conversationText = serializeConversation(llmMessages);

			// Generate the fold summary (non-blocking: editor stays active)
			ctx.ui.setWidget("fold", [ctx.ui.theme.fg("accent", "● ") + ctx.ui.theme.fg("muted", "Generating fold summary...")]);

			let result: string | null = null;
			try {
				const apiKey = await ctx.modelRegistry.getApiKey(ctx.model!);

				const userMessage: Message = {
					role: "user",
					content: [
						{
							type: "text",
							text: `## Conversation History\n\n${conversationText}`,
						},
					],
					timestamp: Date.now(),
				};

				const response = await complete(
					ctx.model!,
					{ systemPrompt: FOLD_SYSTEM_PROMPT, messages: [userMessage] },
					{ apiKey },
				);

				if (response.stopReason === "aborted") {
					result = null;
				} else {
					result = response.content
						.filter((c): c is { type: "text"; text: string } => c.type === "text")
						.map((c) => c.text)
						.join("\n");
				}
			} catch (err) {
				console.error("Fold generation failed:", err);
				result = null;
			} finally {
				ctx.ui.setWidget("fold", undefined);
			}

			if (result === null) {
				ctx.ui.notify("Fold generation failed", "error");
				return;
			}

			// Store summary for session_before_tree handler
			pendingSummary = result;

			// Navigate tree back to anchor with custom summary
			const navResult = await ctx.navigateTree(anchorId, {
				summarize: true,
				label: "fold",
			});

			if (navResult.cancelled) {
				pendingSummary = null;
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			ctx.ui.notify("Fold complete. Ready for next task.", "info");
		},
	});

	pi.registerCommand("branch:prune", {
		description: "Navigate back to last fold point using last message as summary",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("branch:prune requires interactive mode", "error");
				return;
			}

			// Find anchor: last fold marker or first entry
			const branch = ctx.sessionManager.getBranch();
			const anchorId = findFoldAnchor(branch, ctx.sessionManager);

			if (!anchorId) {
				ctx.ui.notify("No conversation to prune", "error");
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
				ctx.ui.notify("No messages to prune", "error");
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
			pendingSummary = text;

			// Navigate tree back to anchor with the last message as summary
			const navResult = await ctx.navigateTree(anchorId, {
				summarize: true,
			});

			if (navResult.cancelled) {
				pendingSummary = null;
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			ctx.ui.notify("Prune complete. Ready for next task.", "info");
		},
	});

	pi.registerCommand("branch:drop", {
		description: "Discard current branch and navigate back to last fold point",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("branch:drop requires interactive mode", "error");
				return;
			}

			// Find anchor: last fold marker or first entry
			const branch = ctx.sessionManager.getBranch();
			const anchorId = findFoldAnchor(branch, ctx.sessionManager);

			if (!anchorId) {
				ctx.ui.notify("No conversation to drop", "error");
				return;
			}

			// Verify there's something after the anchor to drop
			const anchorIndex = branch.findIndex((e) => e.id === anchorId);
			const entriesAfterAnchor = branch.slice(anchorIndex + 1);

			if (entriesAfterAnchor.length === 0) {
				ctx.ui.notify("Nothing to drop", "error");
				return;
			}

			// Navigate tree back to anchor without creating a summary
			const navResult = await ctx.navigateTree(anchorId, {
				summarize: false,
			});

			if (navResult.cancelled) {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			ctx.ui.notify("Branch dropped. Ready for next task.", "info");
		},
	});

	pi.registerCommand("branch:tag", {
		description: "Mark current position as a fold anchor",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("branch:tag requires interactive mode", "error");
				return;
			}

			const leafId = ctx.sessionManager.getLeafId();

			if (!leafId) {
				ctx.ui.notify("No conversation to tag", "error");
				return;
			}

			pi.setLabel(leafId, "fold");
			ctx.ui.notify("Tagged current position as fold anchor", "info");
		},
	});

	pi.registerCommand("branch:undo", {
		description: "Undo last user message and pre-fill editor with its text",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("branch:undo requires interactive mode", "error");
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
