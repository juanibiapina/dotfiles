/**
 * Tools for managing session plans.
 *
 * This extension can be disabled without disabling status publication or raw
 * socket control.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { deletePlan, getSessionContext, savePlan } from "../lib/pi-live/session-context.ts";

export default function (pi: ExtensionAPI): void {
	pi.registerTool({
		name: "save_plan",
		label: "Save Plan",
		description: "Save a finished Markdown plan to the current Pi session context and return its editable file path. The session context records the plan; Pi-live chooses the location. Use ordinary Read and Edit tools for later changes.",
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
				content: [{ type: "text", text: `Saved plan "${title}" to session context at ${plan.path} (ID: ${plan.id}).` }],
				details: { sessionId, plan },
			};
		},
	});

	pi.registerTool({
		name: "delete_plan",
		label: "Delete Plan",
		description: "Delete one plan from the current Pi session context and remove its Markdown file. Use get_session_context to find its exact plan ID.",
		promptSnippet: "Delete a saved plan from this Pi session",
		parameters: Type.Object({
			planId: Type.String({ description: "Exact plan ID from get_session_context." }),
		}),
		async execute(_toolCallId, { planId }, _signal, _onUpdate, ctx) {
			const sessionFile = ctx.sessionManager.getSessionFile();
			if (!sessionFile) throw new Error("Current Pi session has no session file");
			const sessionId = ctx.sessionManager.getSessionId();
			const plan = await deletePlan(sessionFile, sessionId, planId);
			return {
				content: [{ type: "text", text: `Deleted plan "${plan.title}" (${plan.id}) from session context.` }],
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
