/**
 * Handoff extension - hand off to a new session
 *
 * Commands:
 *   /handoff <goal> - Generate a prompt for a new agent and start a new session
 *
 * Uses the current model to write instructions for a fresh agent based on the
 * conversation so far and the stated goal. The new session receives that prompt
 * and starts working immediately.
 */

import { complete, type Message } from "@mariozechner/pi-ai";
import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";
import { BorderedLoader, convertToLlm, serializeConversation } from "@mariozechner/pi-coding-agent";

const systemPrompt = (goal: string) => `Write a brief prompt for a new coding agent session in this same repo to pick up the next task. Goal: ${goal}. Describe the goal succintly.`;

export default function (pi: ExtensionAPI) {
	pi.registerCommand("handoff", {
		description: "Hand off to a new session (usage: /handoff <goal>)",
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
				ctx.ui.notify("Usage: /handoff <goal for new session>", "error");
				return;
			}

			const branch = ctx.sessionManager.getBranch();
			const messages = branch
				.filter((entry): entry is SessionEntry & { type: "message" } => entry.type === "message")
				.map((entry) => entry.message);

			if (messages.length === 0) {
				ctx.ui.notify("No conversation to hand off", "error");
				return;
			}

			const llmMessages = convertToLlm(messages);
			const conversationText = serializeConversation(llmMessages);

			const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
				const loader = new BorderedLoader(tui, theme, "Generating handoff prompt...");
				loader.onAbort = () => done(null);

				const generate = async () => {
					const auth = await ctx.modelRegistry.getApiKeyAndHeaders(ctx.model!);
					if (!auth.ok) throw new Error("Failed to get API credentials");

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
						{ systemPrompt: systemPrompt(goal), messages: [userMessage] },
						{ apiKey: auth.apiKey, headers: auth.headers, signal: loader.signal },
					);

					if (response.stopReason === "aborted") return null;

					return response.content
						.filter((c): c is { type: "text"; text: string } => c.type === "text")
						.map((c) => c.text)
						.join("\n");
				};

				generate()
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

			const newSessionResult = await ctx.newSession({
				withSession: async (newCtx) => {
					await newCtx.sendMessage({
						customType: "handoff-prompt",
						content: result,
						display: true,
					}, { triggerTurn: true });
				},
			});

			if (newSessionResult.cancelled) {
				ctx.ui.notify("New session cancelled", "info");
				return;
			}
		},
	});
}
