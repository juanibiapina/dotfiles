/**
 * Title extension - set the session display name
 *
 * Commands:
 *   /title <name> - Set the session name manually
 *
 * Tools:
 *   set_session_name - Let the agent set the session name itself
 *
 * Events:
 *   before_agent_start - While the session has no name, add a hidden
 *   reminder after the user's prompt asking the agent to name it
 *
 * The session name is shown in the /resume selector instead of the first
 * message.
 */

import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

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

	pi.on("before_agent_start", async () => {
		if (pi.getSessionName()) {
			return;
		}

		return {
			message: {
				customType: "session-name-reminder",
				content:
					"This session has no name yet. Call set_session_name with a 2-5 word title for the session's goal in your first tool batch.",
				display: false,
			},
		};
	});

	pi.registerTool({
		name: "set_session_name",
		label: "Set Session Name",
		description:
			"Set a short title for the current session's overall goal. Call this once per session, in your first tool batch. Keep the title through later steps, including commits and pushes. Pick a concise 2-5 word title.",
		promptSnippet: "Name the session's overall goal once",
		promptGuidelines: [
			"Call set_session_name once per session, in your first tool batch; keep that title for the session.",
		],
		parameters: Type.Object({
			name: Type.String({
				description: "Concise 2-5 word title for the session's overall goal. No quotes, no punctuation.",
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
