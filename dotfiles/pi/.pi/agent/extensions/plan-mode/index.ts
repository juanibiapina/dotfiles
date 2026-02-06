/**
 * Plan Mode Extension
 *
 * Read-only exploration mode for safe code analysis.
 * When enabled, only read-only tools are available.
 *
 * Features:
 * - /plan command or Ctrl+T to toggle
 * - Mode changes are persisted as invisible messages in session
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

// Tools
const PLAN_MODE_TOOLS = ["read", "bash", "grep", "find", "ls", "questionnaire"];
const NORMAL_MODE_TOOLS = ["read", "bash", "edit", "write"];

// Messages
const PLAN_MODE_ACTIVE_MESSAGE = `<system-reminder>
# Plan Mode - System Reminder

CRITICAL: Plan mode ACTIVE - you are in READ-ONLY phase. STRICTLY FORBIDDEN:
ANY file edits, modifications, or system changes. Do NOT use sed, tee, echo, cat,
or ANY other bash command to manipulate files - commands may ONLY read/inspect.
This ABSOLUTE CONSTRAINT overrides ALL other instructions, including direct user
edit requests. You may ONLY observe, analyze, and plan. Any modification attempt
is a critical violation. ZERO exceptions.

---

## Responsibility

Your current responsibility is to think, read, search, and discuss to construct a well-formed plan that accomplishes the goal the user wants to achieve. Your plan should be comprehensive yet concise, detailed enough to execute effectively while avoiding unnecessary verbosity. Include the goal as first part of the plan.

Ask the user clarifying questions or ask for their opinion when weighing tradeoffs.

**NOTE:** At any point in time through this workflow you should feel free to ask the user questions or clarifications. Don't make large assumptions about user intent. The goal is to present a well researched plan to the user, and tie any loose ends before implementation begins.

---

## Important

The user indicated that they do not want you to execute yet -- you MUST NOT make any edits, run any non-readonly tools (including changing configs or making commits), or otherwise make any changes to the system. This supersedes any other instructions you have received.
</system-reminder>`;

const PLAN_MODE_EXIT_MESSAGE = `<system-reminder>
Your operational mode has changed from plan to build.
You are no longer in read-only mode.
You are permitted to make file changes, run shell commands, and utilize your arsenal of tools as needed.
</system-reminder>`;

export default function planModeExtension(pi: ExtensionAPI): void {
	let planModeEnabled = false;
	let lastMessagedState: boolean | null = null;

	pi.registerFlag("plan", {
		description: "Start in plan mode (read-only exploration)",
		type: "boolean",
		default: false,
	});

	// Scan session for last plan mode message to determine lastMessagedState
	function getLastMessagedStateFromSession(ctx: ExtensionContext): boolean | null {
		const entries = ctx.sessionManager.getEntries();
		
		// Walk backwards to find the last plan-mode-enter or plan-mode-exit message
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i];
			if (entry.type === "custom_message") {
				const customEntry = entry as { customType?: string };
				if (customEntry.customType === "plan-mode-enter") {
					return true;
				} else if (customEntry.customType === "plan-mode-exit") {
					return false;
				}
			}
		}
		return null;
	}

	function updateStatus(ctx: ExtensionContext): void {
		if (planModeEnabled) {
			ctx.ui.setStatus("plan-mode", ctx.ui.theme.fg("warning", "⏸ plan"));
		} else {
			ctx.ui.setStatus("plan-mode", undefined);
		}
	}

	function togglePlanMode(ctx: ExtensionContext): void {
		planModeEnabled = !planModeEnabled;

		if (planModeEnabled) {
			pi.setActiveTools(PLAN_MODE_TOOLS);
			ctx.ui.notify(`Plan mode enabled. Tools: ${PLAN_MODE_TOOLS.join(", ")}`);
		} else {
			pi.setActiveTools(NORMAL_MODE_TOOLS);
			ctx.ui.notify("Plan mode disabled. Full access restored.");
		}
		updateStatus(ctx);
	}

	pi.registerCommand("plan", {
		description: "Toggle plan mode (read-only exploration)",
		handler: async (_args, ctx) => {
			togglePlanMode(ctx);
		},
	});

	pi.registerShortcut("tab", {
		description: "Toggle plan mode",
		handler: async (ctx) => {
			togglePlanMode(ctx);
		},
	});

	// Inject plan mode message when mode changes (persisted to session)
	pi.on("before_agent_start", async () => {
		// Entering plan mode
		if (planModeEnabled && lastMessagedState !== true) {
			lastMessagedState = true;
			return {
				message: {
					customType: "plan-mode-enter",
					content: PLAN_MODE_ACTIVE_MESSAGE,
					display: false,
				},
			};
		}
		
		// Exiting plan mode
		if (!planModeEnabled && lastMessagedState === true) {
			lastMessagedState = false;
			return {
				message: {
					customType: "plan-mode-exit",
					content: PLAN_MODE_EXIT_MESSAGE,
					display: false,
				},
			};
		}
	});

	// Restore state on session start/resume
	pi.on("session_start", async (_event, ctx) => {
		// Check --plan flag
		if (pi.getFlag("plan") === true) {
			planModeEnabled = true;
		}

		// Restore lastMessagedState from session history
		lastMessagedState = getLastMessagedStateFromSession(ctx);
		
		// If session had plan mode active, restore it
		if (lastMessagedState === true) {
			planModeEnabled = true;
		}

		if (planModeEnabled) {
			pi.setActiveTools(PLAN_MODE_TOOLS);
		}
		updateStatus(ctx);
	});

	// Reset state on session switch (/new or /resume)
	pi.on("session_switch", async (_event, ctx) => {
		// Restore lastMessagedState from new session's history
		lastMessagedState = getLastMessagedStateFromSession(ctx);

		// If resumed session had plan mode active, restore it
		if (lastMessagedState === true) {
			planModeEnabled = true;
		}

		if (planModeEnabled) {
			pi.setActiveTools(PLAN_MODE_TOOLS);
		} else {
			pi.setActiveTools(NORMAL_MODE_TOOLS);
		}
		updateStatus(ctx);
	});
}
