/**
 * Tools for listing and messaging sessions published by pi-live.
 *
 * This extension can be disabled without disabling status publication or raw
 * socket control.
 */

import { basename } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { createSessionClient } from "../lib/pi-live/session-client.ts";

export default function (pi: ExtensionAPI): void {
	const client = createSessionClient();

	pi.registerTool({
		name: "list_pi_sessions",
		label: "List Pi Sessions",
		description:
			"List live Pi sessions on this machine with their exact session IDs, names, idle or working state, projects, and tmux locations. The current session is marked. Use before send_pi_message when the target session ID is unknown.",
		promptSnippet: "List live local Pi sessions and their exact IDs",
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			const currentSessionId = ctx.sessionManager.getSessionId();
			const sessions = await client.listSessions();
			const lines = sessions.map((session) => {
				const name = session.name?.replace(/\s+/g, " ").trim() || "(unnamed)";
				const location = session.tmux
					? `${session.tmux.sessionName}:${session.tmux.windowIndex} ${session.tmux.paneId}`
					: "(no tmux)";
				const current =
					session.sessionId === currentSessionId ? " (current)" : "";
				return `${session.sessionId}  ${name}  ${session.state}  ${location}  ${basename(session.cwd)}${current}`;
			});

			return {
				content: [
					{
						type: "text",
						text: lines.length > 0 ? lines.join("\n") : "No live Pi sessions.",
					},
				],
				details: {
					sessions: sessions.map((session) => ({
						...session,
						current: session.sessionId === currentSessionId,
					})),
				},
			};
		},
	});

	pi.registerTool({
		name: "send_pi_message",
		label: "Send Pi Message",
		description:
			"Send a one-way message to one live Pi session on this machine. The recipient receives this session's identity and exact instructions for replying with send_pi_message. Use list_pi_sessions first when the target session ID is unknown.",
		promptSnippet: "Send a reply-addressed message to another local Pi session",
		parameters: Type.Object({
			targetSessionId: Type.String({
				description: "Full target session ID from list_pi_sessions.",
			}),
			message: Type.String({
				description: "Non-empty message to deliver to the target Pi session.",
			}),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const { targetSessionId, message } = params as {
				targetSessionId: string;
				message: string;
			};
			const result = await client.sendMessage({
				senderSessionId: ctx.sessionManager.getSessionId(),
				targetSessionId,
				message,
			});
			const targetName = result.target.name ? ` (${result.target.name})` : "";
			const delivery =
				result.delivery === "immediate"
					? "delivered immediately"
					: "queued as a follow-up";
			return {
				content: [
					{
						type: "text",
						text: `Message ${delivery} for ${result.target.sessionId}${targetName}.`,
					},
				],
				details: {
					targetSessionId: result.target.sessionId,
					targetName: result.target.name,
					delivery: result.delivery,
				},
			};
		},
	});
}
