/**
 * Ralph extension — autonomous development loop driven by tools and events.
 *
 * Commands:
 *   /ralph — Activate ralph mode and start/resume the loop
 *
 * Tools:
 *   ralph_phase_done — Agent calls to complete the current phase
 *   ralph_loop_done  — Agent calls from plan phase when all steps are done
 *
 * Events:
 *   before_agent_start — Injects phase-specific system prompt when ralph is active
 *   session_start      — Restores persisted state
 *   session_tree       — Continues the loop after phase summarization
 *
 * Architecture:
 *   Event-driven state machine. No long-running command loop.
 *
 *   /ralph initializes state, creates a working branch, and sends the first phase message.
 *   The agent works on the phase and calls ralph_phase_done when done.
 *   ralph_phase_done queues a navigateTree to summarize the phase.
 *   After navigation completes, the session_tree event sends the next phase message.
 *   This creates a self-sustaining loop: tool → navigate → event → message → tool → ...
 *
 *   Phase order: plan → build → document → commit → update_prompt → (loop)
 *
 *   All work stays local — no pushing, no PRs.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
	PHASE_SYSTEM_PROMPTS,
	PHASE_SUMMARY_INSTRUCTIONS,
	PHASE_MESSAGES,
} from "./phase-prompts.js";
import { type RalphState, type Phase, PHASE_ORDER } from "./state.js";

export default function (pi: ExtensionAPI) {
	let state: RalphState = {
		active: false,
		iteration: 0,
		phase: "plan",
	};

	// Leaf ID captured at the start of each phase, used as navigateTree target
	let phaseStartLeafId: string | null = null;

	// Set true by ralph_phase_done when it queues a navigate, cleared by session_tree handler.
	// Guards against spurious session_tree events (e.g. user manual /tree navigation).
	let pendingNavigate = false;

	// ── Helpers ────────────────────────────────────────────────────────────────

	function persistState() {
		pi.appendEntry("ralph-state", { ...state });
	}

	function updateStatus(ctx: ExtensionContext) {
		if (state.active) {
			const label = `🔄 ralph i${state.iteration} → ${state.phase}`;
			ctx.ui.setStatus("ralph", ctx.ui.theme?.fg("accent", label) ?? label);
		} else {
			ctx.ui.setStatus("ralph", undefined);
		}
	}

	function getPhaseSystemPrompt(phase: Phase, iteration: number): string {
		return PHASE_SYSTEM_PROMPTS[phase].replaceAll("{{iteration}}", String(iteration));
	}

	function nextPhase(current: Phase): Phase {
		const idx = PHASE_ORDER.indexOf(current);
		return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
	}

	function generateBranchName(): string {
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, "0");
		const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
		return `ralph/${stamp}`;
	}

	// ── Restore state on session start ─────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		state = { active: false, iteration: 0, phase: "plan" };
		phaseStartLeafId = null;
		pendingNavigate = false;

		const entries = ctx.sessionManager.getEntries();
		const stateEntry = entries
			.filter((e: any) => e.type === "custom" && e.customType === "ralph-state")
			.pop() as { data?: RalphState } | undefined;

		if (stateEntry?.data) {
			state = { ...stateEntry.data };
			// Best-effort anchor for resume
			phaseStartLeafId = ctx.sessionManager.getLeafId() ?? null;
		}
		updateStatus(ctx);
	});

	// ── Inject phase system prompt when ralph active ───────────────────────────

	pi.on("before_agent_start", async (event) => {
		if (!state.active) return;
		const phasePrompt = getPhaseSystemPrompt(state.phase, state.iteration);
		return {
			systemPrompt: event.systemPrompt + "\n\n" + phasePrompt,
		};
	});

	// ── Continue loop after phase navigation ───────────────────────────────────

	pi.on("session_tree", async (event, ctx) => {
		if (!state.active || !pendingNavigate) return;
		pendingNavigate = false;

		// The new leaf after navigation is our anchor for the next phase
		phaseStartLeafId = event.newLeafId;

		// Send the next phase message to kick off the next turn
		pi.sendUserMessage(PHASE_MESSAGES[state.phase]);
	});

	// ── /ralph command ─────────────────────────────────────────────────────────

	pi.registerCommand("ralph", {
		description: "Start or resume the ralph autonomous development loop",
		handler: async (_args, ctx) => {
			const resuming = state.active;

			if (!resuming) {
				// Create a working branch for the entire ralph session
				const branch = generateBranchName();
				const result = await pi.exec("git", ["checkout", "-b", branch]);
				if (result.code !== 0) {
					ctx.ui.notify(`Failed to create branch ${branch}: ${result.stderr}`, "error");
					return;
				}

				phaseStartLeafId = ctx.sessionManager.getLeafId() ?? null;
				state.active = true;
				state.iteration = 1;
				state.phase = "plan";
				persistState();

				ctx.ui.notify(`Ralph activated. Branch: ${branch}. Starting iteration 1, phase: plan.`, "info");
			} else {
				phaseStartLeafId = ctx.sessionManager.getLeafId() ?? null;
				ctx.ui.notify(
					`Ralph resuming iteration ${state.iteration}, phase: ${state.phase}.`,
					"info",
				);
			}

			updateStatus(ctx);
			pi.sendUserMessage(PHASE_MESSAGES[state.phase]);
		},
	});

	// ── ralph_phase_done tool ──────────────────────────────────────────────────

	pi.registerTool({
		name: "ralph_phase_done",
		label: "Ralph Phase Done",
		description:
			"Signal that the current ralph phase is complete. You MUST call this tool to finish each phase. Pass a concise summary of what was accomplished.",
		parameters: Type.Object({
			output: Type.String({ description: "Summary of what was accomplished in this phase" }),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const completedPhase = state.phase;
			const leafId = phaseStartLeafId;

			// Advance phase
			if (completedPhase === "update_prompt") {
				state.iteration++;
			}
			state.phase = nextPhase(completedPhase);
			persistState();
			updateStatus(ctx);

			// Queue navigation to summarize the completed phase
			if (leafId) {
				pendingNavigate = true;
				ctx.queueNavigateTree(leafId, {
					summarize: true,
					customInstructions: PHASE_SUMMARY_INSTRUCTIONS[completedPhase],
					label: `ralph-${completedPhase}-i${state.iteration}`,
				});
			}

			return {
				content: [
					{
						type: "text",
						text: `Phase "${completedPhase}" complete. Do not make further tool calls.`,
					},
				],
				details: {
					phase: completedPhase,
					iteration: state.iteration,
					output: params.output,
				},
			};
		},
	});

	// ── ralph_loop_done tool ───────────────────────────────────────────────────

	pi.registerTool({
		name: "ralph_loop_done",
		label: "Ralph Loop Done",
		description:
			"Signal that all PROMPT.md steps are complete and the ralph loop should end. Call this from the plan phase when all steps are checked off.",
		parameters: Type.Object({
			summary: Type.String({ description: "Final summary of all completed work" }),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const iterations = state.iteration;
			state.active = false;
			persistState();
			updateStatus(ctx);

			return {
				content: [
					{
						type: "text",
						text: `Ralph loop complete after ${iterations} iteration(s).\n\n${params.summary}`,
					},
				],
				details: {
					iterations,
					summary: params.summary,
				},
			};
		},
	});
}
