/**
 * Title extension - auto-generate session name from conversation
 *
 * Commands:
 *   /title - Generate a concise session name from the conversation content
 *
 * Calls the LLM to produce a 2-5 word title capturing the main topic,
 * then sets it as the session name (visible in /resume selector).
 */

import { complete, type Message } from "@mariozechner/pi-ai";
import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";
import { convertToLlm, serializeConversation } from "@mariozechner/pi-coding-agent";

const TITLE_SYSTEM_PROMPT = `Generate a 2-5 word title for this conversation. The title should capture the main component, concept, or pattern being worked on. Output ONLY the title, nothing else. No quotes, no punctuation, no explanation.`;

export default function (pi: ExtensionAPI) {
	pi.registerCommand("title", {
		description: "Auto-generate a session name from the conversation",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("title requires interactive mode", "error");
				return;
			}

			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
				return;
			}

			const branch = ctx.sessionManager.getBranch();
			const messages: Parameters<typeof convertToLlm>[0] = [];
			for (const entry of branch) {
				if (entry.type === "message") {
					messages.push(entry.message);
				} else if (entry.type === "branch_summary") {
					messages.push({
						role: "branchSummary" as const,
						summary: entry.summary,
						fromId: entry.fromId,
						timestamp: Date.parse(entry.timestamp),
					});
				}
			}

			if (messages.length === 0) {
				ctx.ui.notify("No conversation to title", "error");
				return;
			}

			const llmMessages = convertToLlm(messages);
			const conversationText = serializeConversation(llmMessages);

			// Show progress widget (non-blocking)
			ctx.ui.setWidget("title", [ctx.ui.theme.fg("accent", "● ") + ctx.ui.theme.fg("muted", "Generating title...")]);

			let title: string | null = null;
			try {
				const apiKey = await ctx.modelRegistry.getApiKey(ctx.model!);

				const userMessage: Message = {
					role: "user",
					content: [
						{
							type: "text",
							text: conversationText,
						},
					],
					timestamp: Date.now(),
				};

				const response = await complete(
					ctx.model!,
					{ systemPrompt: TITLE_SYSTEM_PROMPT, messages: [userMessage] },
					{ apiKey },
				);

				if (response.stopReason !== "aborted") {
					title = response.content
						.filter((c): c is { type: "text"; text: string } => c.type === "text")
						.map((c) => c.text)
						.join(" ")
						.trim();
				}
			} catch (err) {
				console.error("Title generation failed:", err);
			} finally {
				ctx.ui.setWidget("title", undefined);
			}

			if (!title) {
				ctx.ui.notify("Title generation failed", "error");
				return;
			}

			pi.setSessionName(title);
			ctx.ui.notify(`Session named: ${title}`, "info");
		},
	});
}
