/**
 * Recap extension - summarize and roll back the session tree
 *
 * Commands:
 *   /recap - Summarize the conversation and navigate back to a clean starting point
 *   /recap <task> - Summarize with a follow-up task and continue the agent loop
 *
 * Recap generates a summary of the current conversation branch, then navigates
 * the session tree back to the beginning (or the last recap point), using the
 * generated summary as the branch summary.
 *
 * Without arguments, the editor is left empty for the user to type their next prompt.
 * With arguments, the summary includes the follow-up task and is automatically
 * submitted to continue the agent loop.
 *
 * Usage:
 *   /recap
 *   /recap implement the search feature
 *   /recap fix the failing tests from the previous attempt
 */

import { complete, type Message } from "@mariozechner/pi-ai";
import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";
import { convertToLlm, serializeConversation } from "@mariozechner/pi-coding-agent";

const RECAP_SYSTEM_PROMPT = `You are a context summarization assistant. Given a conversation history, generate a concise summary that captures:

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

const RECAP_WITH_TASK_SYSTEM_PROMPT = `You are a context summarization assistant. Given a conversation history and the user's goal for a follow-up task, generate a concise self-contained summary that captures:

1. Relevant context from the conversation (decisions made, approaches taken, key findings)
2. Any relevant files that were discussed or modified
3. Current state of the work (what's done, what's pending, any blockers)
4. The follow-up task based on the user's goal

The summary must be self-contained — the reader should be able to proceed without the original conversation. Be concise but include all necessary context. Do not include any preamble like "Here's the summary" - just output the summary itself.

Example output format:
## Context
We've been working on X. Key decisions:
- Decision 1
- Decision 2

## Files
- path/to/file1.ts - description of changes
- path/to/file2.ts - description of changes

## Current State
[What's been accomplished and what remains]

## Task
[Clear description of what to do next based on user's goal]`;

export default function (pi: ExtensionAPI) {
	let pendingRecapSummary: string | null = null;

	// Intercept tree navigation to provide custom summary when recapping
	pi.on("session_before_tree", async (_event, _ctx) => {
		if (pendingRecapSummary !== null) {
			const summary = pendingRecapSummary;
			pendingRecapSummary = null;
			return { summary: { summary, details: {} } };
		}
	});

	pi.registerCommand("recap", {
		description: "Summarize conversation and roll back to a clean starting point",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("recap requires interactive mode", "error");
				return;
			}

			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
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
				ctx.ui.notify("No conversation to recap", "error");
				return;
			}

			// Gather messages after anchor for summarization
			const anchorIndex = branch.findIndex((e) => e.id === anchorId);
			const entriesAfterAnchor = branch.slice(anchorIndex + 1);
			const messages = entriesAfterAnchor
				.filter((entry): entry is SessionEntry & { type: "message" } => entry.type === "message")
				.map((entry) => entry.message);

			if (messages.length === 0) {
				ctx.ui.notify("No conversation to recap", "error");
				return;
			}

			// Convert to LLM format and serialize
			const llmMessages = convertToLlm(messages);
			const conversationText = serializeConversation(llmMessages);
			const goal = args.trim();
			const hasFollowUp = goal.length > 0;

			// Generate the recap summary (non-blocking: editor stays active)
			const statusMessage = hasFollowUp ? "Generating recap with follow-up..." : "Generating recap summary...";
			ctx.ui.setWidget("recap", [ctx.ui.theme.fg("accent", "● ") + ctx.ui.theme.fg("muted", statusMessage)]);

			let result: string | null = null;
			try {
				const apiKey = await ctx.modelRegistry.getApiKey(ctx.model!);

				let messageText = `## Conversation History\n\n${conversationText}`;
				if (hasFollowUp) {
					messageText += `\n\n## User's Follow-up Task\n\n${goal}`;
				}

				const userMessage: Message = {
					role: "user",
					content: [
						{
							type: "text",
							text: messageText,
						},
					],
					timestamp: Date.now(),
				};

				const systemPrompt = hasFollowUp ? RECAP_WITH_TASK_SYSTEM_PROMPT : RECAP_SYSTEM_PROMPT;

				const response = await complete(
					ctx.model!,
					{ systemPrompt, messages: [userMessage] },
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
				console.error("Recap generation failed:", err);
				result = null;
			} finally {
				ctx.ui.setWidget("recap", undefined);
			}

			if (result === null) {
				ctx.ui.notify("Recap generation failed", "error");
				return;
			}

			// Store summary for session_before_tree handler
			pendingRecapSummary = result;

			// Navigate tree back to anchor with custom summary
			const navResult = await ctx.navigateTree(anchorId, {
				summarize: true,
				label: "recap",
			});

			if (navResult.cancelled) {
				pendingRecapSummary = null;
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			if (hasFollowUp) {
				// Submit the summary+task to continue the agent loop
				pi.sendUserMessage(result);
			} else {
				ctx.ui.notify("Recap complete. Ready for next task.", "info");
			}
		},
	});
}
