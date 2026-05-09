/**
 * Title extension - set the session display name
 *
 * Commands:
 *   /title <name> - Set the session name manually
 *
 * Tools:
 *   set_session_name - Let the agent set the session name itself
 *
 * The session name is shown in the /resume selector instead of the first
 * message.
 */

import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("title", {
		description: "Set the session name (usage: /title <name>)",
		handler: async (args, ctx) => {
			const name = args.trim();

			if (!name) {
				ctx.ui.notify("Usage: /title <name>", "error");
				return;
			}

			pi.setSessionName(name);
			ctx.ui.notify(`Session named: ${name}`, "info");
		},
	});

	pi.registerTool({
		name: "set_session_name",
		label: "Set Session Name",
		description:
			"Set a short title for the current session. Always call this once as soon as the user's intent is clear, and call it again later if the topic changes substantially. Pick a concise 2-5 word title that captures the main topic, component, or task.",
		promptSnippet: "Set a short session title shown in the session list",
		promptGuidelines: [
			"Call set_session_name once as soon as the user's intent is clear, and call it again if the topic changes substantially.",
		],
		parameters: Type.Object({
			name: Type.String({
				description: "Concise 2-5 word title for the session. No quotes, no punctuation.",
			}),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			const { name } = params as { name: string };
			const trimmed = name.trim();

			if (!trimmed) {
				throw new Error("Session name must not be empty");
			}

			pi.setSessionName(trimmed);
			return {
				content: [{ type: "text", text: `Session named: ${trimmed}` }],
				details: { name: trimmed },
			};
		},
	});
}
