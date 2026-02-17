/**
 * Ralph L1 extension — orchestrator for the autonomous development loop.
 *
 * Commands:
 *   /ralph   — Activate ralph mode and start the autonomous loop
 *
 * Tool:
 *   ralph_next — Spawns one L2 iteration session, returns compact summary
 *
 * Events:
 *   before_agent_start — Injects orchestrator system prompt when ralph mode active
 *   session_start      — Restores persisted state
 */

import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { ORCHESTRATOR_PROMPT, ITERATION_WORKFLOW_PROMPT } from "./phase-prompts.js";
import { runPhase } from "./runner.js";
import { type RalphState, getSessionPath } from "./state.js";

const EXTENSION_DIR = path.join(os.homedir(), ".pi", "agent", "extensions", "ralph");
const ITERATION_EXTENSION = path.join(EXTENSION_DIR, "iteration.ts");

export default function (pi: ExtensionAPI) {
	let state: RalphState = {
		active: false,
		iteration: 0,
	};

	// ── State persistence ──────────────────────────────────────────────────────

	function persistState() {
		pi.appendEntry("ralph-state", { ...state });
	}

	function updateStatus(ctx: ExtensionContext) {
		if (state.active) {
			ctx.ui.setStatus("ralph", ctx.ui.theme.fg("accent", `🔄 ralph iter ${state.iteration}`));
		} else {
			ctx.ui.setStatus("ralph", undefined);
		}
	}

	// ── Restore state on session start ─────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		const entries = ctx.sessionManager.getEntries();
		const stateEntry = entries
			.filter((e: any) => e.type === "custom" && e.customType === "ralph-state")
			.pop() as { data?: RalphState } | undefined;

		if (stateEntry?.data) {
			state = { ...stateEntry.data };
		}
		updateStatus(ctx);
	});

	// ── Inject orchestrator system prompt when ralph active ────────────────────

	pi.on("before_agent_start", async (event) => {
		if (!state.active) return;
		return {
			systemPrompt: event.systemPrompt + "\n\n" + ORCHESTRATOR_PROMPT,
		};
	});

	// ── /ralph command ─────────────────────────────────────────────────────────

	pi.registerCommand("ralph", {
		description: "Start the ralph autonomous development loop",
		handler: async (_args, ctx) => {
			if (state.active) {
				ctx.ui.notify("Ralph is already active. Use ralph_next to continue.", "info");
				return;
			}

			state.active = true;
			state.iteration = 0;
			persistState();
			updateStatus(ctx);

			ctx.ui.notify("Ralph mode activated. Starting autonomous loop.", "info");

			pi.sendUserMessage(
				"Start the ralph loop. Call ralph_next to begin the first iteration. Continue calling ralph_next until you receive RALPH_DONE.",
			);
		},
	});

	// ── ralph_next tool ────────────────────────────────────────────────────────

	pi.registerTool({
		name: "ralph_next",
		label: "Ralph Next",
		description:
			"Execute the next iteration of the ralph development loop. Returns a summary of what was done, or RALPH_DONE if all steps are complete.",
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, signal, onUpdate, ctx) {
			state.iteration++;
			persistState();
			updateStatus(ctx);

			onUpdate?.({
				content: [{ type: "text", text: `Starting iteration ${state.iteration}...` }],
			});

			const sessionFile = getSessionPath(ctx.cwd, state.iteration);

			const result = await runPhase({
				sessionFile,
				cwd: ctx.cwd,
				message:
					"Execute one iteration of the ralph development loop. Follow the workflow: plan → build → document → commit → pr → wait_pr → update_prompt.",
				systemPrompt: ITERATION_WORKFLOW_PROMPT,
				extension: ITERATION_EXTENSION,
				noExtensions: true,
				noSkills: true,
				noPromptTemplates: true,
				signal,
			});

			// Check for completion marker
			const isDone = result.output.includes("RALPH_DONE");

			if (isDone) {
				state.active = false;
				persistState();
				updateStatus(ctx);
			}

			return {
				content: [{ type: "text", text: result.output || "(no output)" }],
				details: {
					iteration: state.iteration,
					exitCode: result.exitCode,
					done: isDone,
				},
				isError: result.exitCode !== 0 && !isDone,
			};
		},
	});
}
