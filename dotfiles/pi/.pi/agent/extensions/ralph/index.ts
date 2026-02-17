/**
 * Ralph extension — autonomous development loop in a single pi session.
 *
 * Commands:
 *   /ralph — Activate ralph mode and start/resume the loop
 *
 * Tools:
 *   ralph_phase_done — Agent calls to complete the current phase
 *   ralph_loop_done  — Agent calls from plan phase when all steps are done
 *   ralph_poll_pr    — Polls a PR for review status, auto-merges on approval
 *
 * Events:
 *   before_agent_start — Injects phase-specific system prompt when ralph is active
 *   session_start      — Restores persisted state
 *
 * Architecture:
 *   Single session with navigateTree + summarization for context management.
 *   The /ralph command handler drives the phase cycle in a while loop:
 *     1. sendUserMessage(phase prompt) to start the phase
 *     2. await phaseCompletePromise (resolved when ralph_phase_done tool executes)
 *     3. await waitForIdle() (agent is streaming when promise resolves)
 *     4. navigateTree(phaseStartLeafId) to summarize the phase
 *     5. Advance phase, persist state, loop
 *   Phase order: plan → build → document → commit → pr → wait_pr → update_prompt → (loop)
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
	PHASE_SYSTEM_PROMPTS,
	PHASE_SUMMARY_INSTRUCTIONS,
	PHASE_MESSAGES,
	ITERATION_SUMMARY_INSTRUCTIONS,
} from "./phase-prompts.js";
import { type RalphState, type Phase, PHASE_ORDER } from "./state.js";

export default function (pi: ExtensionAPI) {
	let state: RalphState = {
		active: false,
		iteration: 0,
		phase: "plan",
	};

	// Promise resolvers — set by the /ralph loop, called by tools
	let phaseResolve: ((output: string) => void) | null = null;
	let loopResolve: ((summary: string) => void) | null = null;

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

	function sleep(ms: number, signal?: AbortSignal): Promise<void> {
		return new Promise((resolve) => {
			const timeout = setTimeout(resolve, ms);
			signal?.addEventListener(
				"abort",
				() => {
					clearTimeout(timeout);
					resolve();
				},
				{ once: true },
			);
		});
	}

	async function gatherReviewComments(prUrl: string, signal?: AbortSignal): Promise<string> {
		const parts: string[] = [];

		// Top-level review bodies
		const reviewsResult = await pi.exec("gh", ["pr", "view", prUrl, "--json", "reviews"], { signal });
		if (reviewsResult.code === 0) {
			try {
				const data = JSON.parse(reviewsResult.stdout);
				const bodies = (data.reviews || [])
					.filter((r: any) => r.state === "CHANGES_REQUESTED" && r.body)
					.map((r: any) => r.body);
				if (bodies.length > 0) {
					parts.push("## Review Comments\n\n" + bodies.join("\n\n---\n\n"));
				}
			} catch {
				/* ignore parse errors */
			}
		}

		// Inline review thread comments
		const threadsResult = await pi.exec("gh", ["pr", "view", prUrl, "--json", "reviewThreads"], { signal });
		if (threadsResult.code === 0) {
			try {
				const data = JSON.parse(threadsResult.stdout);
				const threads = (data.reviewThreads || []).filter((t: any) => !t.isResolved);
				const threadTexts = threads.map((t: any) => {
					const comments = t.comments || [];
					return comments.map((c: any) => `${c.path}:${c.line || ""}\n${c.body}`).join("\n");
				});
				if (threadTexts.length > 0) {
					parts.push("## Inline Comments\n\n" + threadTexts.join("\n\n---\n\n"));
				}
			} catch {
				/* ignore parse errors */
			}
		}

		return parts.length > 0 ? parts.join("\n\n") : "(no review comments found)";
	}

	// ── Restore state on session start ─────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		// Reset in-memory state (covers /new where there are no entries)
		state = { active: false, iteration: 0, phase: "plan" };

		// Restore from persisted state if available (covers resumed sessions)
		const entries = ctx.sessionManager.getEntries();
		const stateEntry = entries
			.filter((e: any) => e.type === "custom" && e.customType === "ralph-state")
			.pop() as { data?: RalphState } | undefined;

		if (stateEntry?.data) {
			state = { ...stateEntry.data };
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

	// ── /ralph command ─────────────────────────────────────────────────────────

	pi.registerCommand("ralph", {
		description: "Start or resume the ralph autonomous development loop",
		handler: async (_args, ctx) => {
			const resuming = state.active;

			// Track leaf IDs locally — these are session-ephemeral and must be
			// captured BEFORE any persistState() call (which appends a custom
			// entry and changes the session leaf).
			let phaseStartLeafId: string | null;
			let iterationStartLeafId: string | null;

			if (!resuming) {
				// Capture leaf before persist changes it
				phaseStartLeafId = ctx.sessionManager.getLeafId() ?? null;
				iterationStartLeafId = phaseStartLeafId;

				state.active = true;
				state.iteration = 1;
				state.phase = "plan";
				persistState();
			} else {
				// On resume, use current leaf as best-effort anchor
				phaseStartLeafId = ctx.sessionManager.getLeafId() ?? null;
				iterationStartLeafId = phaseStartLeafId;
			}

			updateStatus(ctx);
			ctx.ui.notify(
				resuming
					? `Ralph resuming iteration ${state.iteration}, phase: ${state.phase}.`
					: "Ralph activated. Starting iteration 1, phase: plan.",
				"info",
			);

			// Main phase loop
			while (state.active) {
				const currentPhase = state.phase;

				// Create promises for this turn
				const phasePromise = new Promise<{ type: "phase"; output: string }>((resolve) => {
					phaseResolve = (output) => resolve({ type: "phase", output });
				});
				const loopPromise = new Promise<{ type: "loop"; summary: string }>((resolve) => {
					loopResolve = (summary) => resolve({ type: "loop", summary });
				});

				// Send phase message to start the agent turn
				pi.sendUserMessage(PHASE_MESSAGES[currentPhase]);

				// Also detect agent turn ending without phase completion (e.g. user abort)
				const idlePromise = ctx.waitForIdle().then(() => ({ type: "idle" as const }));

				// Wait for either ralph_phase_done, ralph_loop_done, or agent turn ending
				const result = await Promise.race([phasePromise, loopPromise, idlePromise]);

				// Clean up resolvers
				phaseResolve = null;
				loopResolve = null;

				if (result.type === "idle") {
					// Agent turn ended without completing the phase (likely aborted by user)
					ctx.ui.notify(`Ralph: phase "${currentPhase}" interrupted. Run /ralph to resume.`, "warn");
					break; // Keep state.active so /ralph can resume from current phase
				}

				// Wait for the agent turn to fully complete (it's still streaming when the tool resolves)
				await ctx.waitForIdle();

				if (result.type === "loop") {
					// Summarize the final phase before exiting
					if (phaseStartLeafId) {
						await ctx.navigateTree(phaseStartLeafId, {
							summarize: true,
							customInstructions: PHASE_SUMMARY_INSTRUCTIONS[currentPhase],
							label: `ralph-${currentPhase}-i${state.iteration}-final`,
						});
					}
					// State already deactivated by the tool
					updateStatus(ctx);
					ctx.ui.notify("Ralph loop complete.", "info");
					break;
				}

				// Phase complete — summarize via navigateTree
				if (phaseStartLeafId) {
					const navResult = await ctx.navigateTree(phaseStartLeafId, {
						summarize: true,
						customInstructions: PHASE_SUMMARY_INSTRUCTIONS[currentPhase],
						label: `ralph-${currentPhase}-i${state.iteration}`,
					});

					if (navResult.cancelled) {
						ctx.ui.notify("Ralph cancelled during phase summary.", "error");
						state.active = false;
						persistState();
						updateStatus(ctx);
						break;
					}
				}

				// If update_prompt just completed, summarize the entire iteration
				if (currentPhase === "update_prompt") {
					if (iterationStartLeafId) {
						const navResult = await ctx.navigateTree(iterationStartLeafId, {
							summarize: true,
							customInstructions: ITERATION_SUMMARY_INSTRUCTIONS,
							label: `ralph-iteration-${state.iteration}`,
						});

						if (navResult.cancelled) {
							ctx.ui.notify("Ralph cancelled during iteration summary.", "error");
							state.active = false;
							persistState();
							updateStatus(ctx);
							break;
						}
					}

					state.iteration++;
					// Capture new iteration start leaf before persist
					iterationStartLeafId = ctx.sessionManager.getLeafId() ?? null;
				}

				// Capture leaf for next phase BEFORE persist changes it
				phaseStartLeafId = ctx.sessionManager.getLeafId() ?? null;

				// Advance to next phase
				state.phase = nextPhase(currentPhase);
				persistState();
				updateStatus(ctx);
			}
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
		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			if (phaseResolve) {
				phaseResolve(params.output);
			}

			return {
				content: [
					{
						type: "text",
						text: `Phase "${state.phase}" complete. The loop driver will advance to the next phase. Do not make further tool calls.`,
					},
				],
				details: {
					phase: state.phase,
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

			if (loopResolve) {
				loopResolve(params.summary);
			}

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

	// ── ralph_poll_pr tool ─────────────────────────────────────────────────────

	pi.registerTool({
		name: "ralph_poll_pr",
		label: "Poll PR",
		description:
			"Poll a pull request for review status. Waits (polling every 30s) until the status changes. Auto-merges on approval. Returns review comments on CHANGES_REQUESTED.",
		parameters: Type.Object({
			pr_url: Type.String({ description: "The pull request URL to poll" }),
		}),
		async execute(_toolCallId, params, signal, onUpdate, _ctx) {
			const { pr_url } = params;
			const POLL_INTERVAL = 30_000;
			const MAX_POLLS = 120; // ~1 hour

			for (let poll = 0; poll < MAX_POLLS; poll++) {
				if (signal?.aborted) {
					return {
						content: [{ type: "text", text: "Aborted while waiting for PR review." }],
						isError: true,
					};
				}

				// Poll PR status
				const prCheck = await pi.exec(
					"gh",
					["pr", "view", pr_url, "--json", "state,reviewDecision,number"],
					{ signal },
				);

				if (prCheck.code !== 0) {
					return {
						content: [{ type: "text", text: `Failed to check PR status: ${prCheck.stderr}` }],
						isError: true,
					};
				}

				let status: { state: string; reviewDecision: string; number: number };
				try {
					status = JSON.parse(prCheck.stdout);
				} catch {
					return {
						content: [{ type: "text", text: `Failed to parse PR status: ${prCheck.stdout}` }],
						isError: true,
					};
				}

				// MERGED
				if (status.state === "MERGED") {
					return {
						content: [{ type: "text", text: `PR #${status.number} is already merged.` }],
						details: { prNumber: status.number, status: "merged" },
					};
				}

				// CLOSED
				if (status.state === "CLOSED") {
					return {
						content: [{ type: "text", text: `PR #${status.number} was closed without merging.` }],
						details: { prNumber: status.number, status: "closed" },
						isError: true,
					};
				}

				// APPROVED → merge
				if (status.reviewDecision === "APPROVED") {
					const mergeResult = await pi.exec(
						"gh",
						["pr", "merge", pr_url, "--merge", "--delete-branch"],
						{ signal },
					);

					if (mergeResult.code !== 0) {
						return {
							content: [
								{ type: "text", text: `PR approved but merge failed: ${mergeResult.stderr}` },
							],
							details: { prNumber: status.number, status: "merge_failed" },
							isError: true,
						};
					}

					return {
						content: [{ type: "text", text: `PR #${status.number} approved and merged.` }],
						details: { prNumber: status.number, status: "merged" },
					};
				}

				// CHANGES_REQUESTED → return comments
				if (status.reviewDecision === "CHANGES_REQUESTED") {
					const comments = await gatherReviewComments(pr_url, signal);
					return {
						content: [
							{
								type: "text",
								text: `PR #${status.number} has changes requested.\n\n${comments}`,
							},
						],
						details: { prNumber: status.number, status: "changes_requested" },
					};
				}

				// Pending → wait
				onUpdate?.({
					content: [
						{
							type: "text",
							text: `Waiting for review on PR #${status.number}... (poll ${poll + 1}/${MAX_POLLS})`,
						},
					],
				});

				await sleep(POLL_INTERVAL, signal);
			}

			return {
				content: [
					{ type: "text", text: `Timed out waiting for PR review after ${MAX_POLLS} polls (~1 hour).` },
				],
				isError: true,
			};
		},
	});
}
