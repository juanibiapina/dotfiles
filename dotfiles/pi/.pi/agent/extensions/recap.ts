/**
 * Recap extension - summarize and roll back the session tree
 *
 * Commands:
 *   /recap - Summarize the conversation and navigate back to a clean starting point
 *
 * Recap generates a handoff-style summary of the current conversation branch,
 * then navigates the session tree back to the beginning (or the last recap point),
 * using the generated summary as the branch summary. The editor is left empty
 * for the user to type their next prompt.
 *
 * Usage:
 *   /recap
 */

import { complete, type Message } from "@mariozechner/pi-ai";
import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";
import { BorderedLoader, convertToLlm, serializeConversation } from "@mariozechner/pi-coding-agent";

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
		handler: async (_args, ctx) => {
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

			// Generate the recap summary with loader UI
			const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
				const loader = new BorderedLoader(tui, theme, `Generating recap summary...`);
				loader.onAbort = () => done(null);

				const doGenerate = async () => {
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
						{ systemPrompt: RECAP_SYSTEM_PROMPT, messages: [userMessage] },
						{ apiKey, signal: loader.signal },
					);

					if (response.stopReason === "aborted") {
						return null;
					}

					return response.content
						.filter((c): c is { type: "text"; text: string } => c.type === "text")
						.map((c) => c.text)
						.join("\n");
				};

				doGenerate()
					.then(done)
					.catch((err) => {
						console.error("Recap generation failed:", err);
						done(null);
					});

				return loader;
			});

			if (result === null) {
				ctx.ui.notify("Cancelled", "info");
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

			ctx.ui.notify("Recap complete. Ready for next task.", "info");
		},
	});
}
