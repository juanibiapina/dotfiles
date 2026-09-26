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
import { getSessionContext, savePlan } from "../lib/pi-live/session-context.ts";

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

	pi.registerTool({
		name: "save_plan",
		label: "Save Plan",
		description: "Save a finished Markdown plan for the current Pi session and return its editable file path. Pi-live chooses the location and adds the plan to the session context. Use ordinary Read and Edit tools for later changes.",
		promptSnippet: "Save a finished plan in this session and get its file path",
		parameters: Type.Object({
			title: Type.String({ description: "Plan title." }),
			content: Type.String({ description: "Full Markdown content of the plan." }),
		}),
		async execute(_toolCallId, { title, content }, _signal, _onUpdate, ctx) {
			const sessionFile = ctx.sessionManager.getSessionFile();
			if (!sessionFile) throw new Error("Current Pi session has no session file");
			const sessionId = ctx.sessionManager.getSessionId();
			const plan = await savePlan(sessionFile, sessionId, title, content);
			return {
				content: [{ type: "text", text: `Saved plan "${title}" at ${plan.path} (ID: ${plan.id}).` }],
				details: { sessionId, plan },
			};
		},
	});

	pi.registerTool({
		name: "get_session_context",
		label: "Get Session Context",
		description: "List plans saved for the current Pi session and return their editable Markdown file paths. Read a plan with the normal Read tool.",
		promptSnippet: "Find saved plans in this Pi session",
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			const sessionFile = ctx.sessionManager.getSessionFile();
			if (!sessionFile) throw new Error("Current Pi session has no session file");
			const sessionId = ctx.sessionManager.getSessionId();
			const { contextPath, plans } = await getSessionContext(sessionFile, sessionId);
			const text = plans.length
				? `Session ${sessionId} plans:\n${plans.map((plan) => `- ${plan.title} (${plan.id}): ${plan.path}`).join("\n")}`
				: `Session ${sessionId} has no plans.`;
			return {
				content: [{ type: "text", text }],
				details: { sessionId, contextPath, plans },
			};
		},
	});
}
