/**
 * Handoff extension - session handoff and return commands
 *
 * Commands:
 *   /handoff <goal> - Transfer context to a new focused child session
 *   /return [context] - Summarize this session and return to parent
 *
 * Handoff extracts what matters for your next task and creates a new session
 * with a generated prompt. Instead of compacting (which is lossy), it preserves
 * the parent session link for returning later.
 *
 * Usage:
 *   /handoff now implement this for teams as well
 *   /handoff execute phase one of the plan
 *   /return
 *   /return focus on the API changes made
 */

import { complete, type Message } from "@mariozechner/pi-ai";
import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";
import { BorderedLoader, convertToLlm, serializeConversation } from "@mariozechner/pi-coding-agent";

const HANDOFF_SYSTEM_PROMPT = `You are a context transfer assistant. Given a conversation history and the user's goal for a new thread, generate a focused prompt that:

1. Summarizes relevant context from the conversation (decisions made, approaches taken, key findings)
2. Lists any relevant files that were discussed or modified
3. Clearly states the next task based on the user's goal
4. Is self-contained - the new thread should be able to proceed without the old conversation

Format your response as a prompt the user can send to start the new thread. Be concise but include all necessary context. Do not include any preamble like "Here's the prompt" - just output the prompt itself.

Example output format:
## Context
We've been working on X. Key decisions:
- Decision 1
- Decision 2

Files involved:
- path/to/file1.ts
- path/to/file2.ts

## Task
[Clear description of what to do next based on user's goal]`;

const RETURN_SUMMARY_PROMPT = `Summarize this conversation for the parent session that spawned it.
Include:
1. What was accomplished
2. Key findings or decisions
3. Any open items or concerns
4. Files modified (if any)

Format as a concise report that can be sent as a message.
Start with "## Summary from child session:" followed by the summary.
Be brief but comprehensive.`;

export default function (pi: ExtensionAPI) {
	// /handoff - transfer context to a new child session
	pi.registerCommand("handoff", {
		description: "Transfer context to a new focused session",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("handoff requires interactive mode", "error");
				return;
			}

			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
				return;
			}

			const goal = args.trim();
			if (!goal) {
				ctx.ui.notify("Usage: /handoff <goal for new thread>", "error");
				return;
			}

			// Gather conversation context from current branch
			const branch = ctx.sessionManager.getBranch();
			const messages = branch
				.filter((entry): entry is SessionEntry & { type: "message" } => entry.type === "message")
				.map((entry) => entry.message);

			if (messages.length === 0) {
				ctx.ui.notify("No conversation to hand off", "error");
				return;
			}

			// Convert to LLM format and serialize
			const llmMessages = convertToLlm(messages);
			const conversationText = serializeConversation(llmMessages);
			const currentSessionFile = ctx.sessionManager.getSessionFile();

			// Generate the handoff prompt with loader UI
			const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
				const loader = new BorderedLoader(tui, theme, `Generating handoff prompt...`);
				loader.onAbort = () => done(null);

				const doGenerate = async () => {
					const apiKey = await ctx.modelRegistry.getApiKey(ctx.model!);

					const userMessage: Message = {
						role: "user",
						content: [
							{
								type: "text",
								text: `## Conversation History\n\n${conversationText}\n\n## User's Goal for New Thread\n\n${goal}`,
							},
						],
						timestamp: Date.now(),
					};

					const response = await complete(
						ctx.model!,
						{ systemPrompt: HANDOFF_SYSTEM_PROMPT, messages: [userMessage] },
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
						console.error("Handoff generation failed:", err);
						done(null);
					});

				return loader;
			});

			if (result === null) {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			// Leave a note in the parent session before handing off
			pi.sendMessage({
				customType: "handoff",
				content: `Handed off for: ${goal}`,
				display: true,
				details: { goal },
			});

			// Create new session with parent tracking
			const newSessionResult = await ctx.newSession({
				parentSession: currentSessionFile,
			});

			if (newSessionResult.cancelled) {
				ctx.ui.notify("New session cancelled", "info");
				return;
			}

			// Build the final prompt with user's goal first for easy identification
			// Format: goal (first line for session preview) → skill → parent ref → context
			let finalPrompt = result;
			if (currentSessionFile) {
				finalPrompt = `${goal}\n\n/skill:session-query\n\n**Parent session:** \`${currentSessionFile}\`\n\n${result}`;
			} else {
				// Even without parent session, put goal first
				finalPrompt = `${goal}\n\n${result}`;
			}

			// Immediately submit the handoff prompt to start the agent
			pi.sendUserMessage(finalPrompt);
		},
	});

	// /return - summarize and return to parent session
	pi.registerCommand("return", {
		description: "Summarize this session and return to parent",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("return requires interactive mode", "error");
				return;
			}

			// Get parent session from header
			const header = ctx.sessionManager.getHeader();
			const parentSession = header?.parentSession;

			if (!parentSession) {
				ctx.ui.notify("No parent session to return to", "error");
				return;
			}

			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
				return;
			}

			// Gather conversation for summary
			const branch = ctx.sessionManager.getBranch();
			const messages = branch
				.filter((entry): entry is SessionEntry & { type: "message" } => entry.type === "message")
				.map((entry) => entry.message);

			if (messages.length === 0) {
				ctx.ui.notify("No conversation to summarize", "error");
				return;
			}

			// Generate summary with loader UI
			const summary = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
				const loader = new BorderedLoader(tui, theme, `Generating summary for parent session...`);
				loader.onAbort = () => done(null);

				const doGenerate = async () => {
					const llmMessages = convertToLlm(messages);
					const conversationText = serializeConversation(llmMessages);

					const apiKey = await ctx.modelRegistry.getApiKey(ctx.model!);
					const additionalContext = args?.trim()
						? `\n\nAdditional context from user: ${args.trim()}`
						: "";

					const userMessage: Message = {
						role: "user",
						content: [
							{
								type: "text",
								text: `${conversationText}${additionalContext}\n\n${RETURN_SUMMARY_PROMPT}`,
							},
						],
						timestamp: Date.now(),
					};

					const response = await complete(
						ctx.model!,
						{ systemPrompt: "", messages: [userMessage] },
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
						console.error("Summary generation failed:", err);
						done(null);
					});

				return loader;
			});

			if (!summary) {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			// Get current session path before switching
			const childSessionFile = ctx.sessionManager.getSessionFile();

			// Switch to parent session
			const result = await ctx.switchSession(parentSession);

			if (result.cancelled) {
				ctx.ui.notify("Session switch cancelled", "info");
				return;
			}

			// Send summary as user message in parent session, including child session reference
			const summaryWithRef = childSessionFile
				? `${summary}\n\n---\n*Returned from child session: \`${childSessionFile}\`*`
				: summary;
			pi.sendUserMessage(summaryWithRef);
		},
	});
}
