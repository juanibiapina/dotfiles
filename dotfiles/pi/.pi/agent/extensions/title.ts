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
			"Set the current session's display name (shown in the session selector instead of the first message). Use a concise 2-5 word title that captures the main topic, component, or task.",
		promptSnippet: "Set the current session's display name to a concise 2-5 word title",
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
