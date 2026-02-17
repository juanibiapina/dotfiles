/**
 * Ralph extension — autonomous development loop driven by tools and events.
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
 *   session_tree       — Continues the loop after phase summarization
 *
 * Architecture:
 *   Event-driven state machine. No long-running command loop.
 *
 *   /ralph initializes state and sends the first phase message.
 *   The agent works on the phase and calls ralph_phase_done when done.
 *   ralph_phase_done queues a navigateTree to summarize the phase.
 *   After navigation completes, the session_tree event sends the next phase message.
 *   This creates a self-sustaining loop: tool → navigate → event → message → tool → ...
 *
 *   Phase order: plan → build → document → commit → pr → wait_pr → update_prompt → (loop)
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
				phaseStartLeafId = ctx.sessionManager.getLeafId() ?? null;
				state.active = true;
				state.iteration = 1;
				state.phase = "plan";
				persistState();
			} else {
				phaseStartLeafId = ctx.sessionManager.getLeafId() ?? null;
			}

			updateStatus(ctx);
			ctx.ui.notify(
				resuming
					? `Ralph resuming iteration ${state.iteration}, phase: ${state.phase}.`
					: "Ralph activated. Starting iteration 1, phase: plan.",
				"info",
			);

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

	// ── ralph_poll_pr tool ─────────────────────────────────────────────────────

	pi.registerTool({
		name: "ralph_poll_pr",
		label: "Poll PR",
		description:
			"Poll a pull request for review status and CI checks. Waits (polling every 30s) until something actionable happens. Returns immediately on: CI check failure, review with changes requested, PR approval (auto-merges), or PR closed/merged.",
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

				if (status.state === "MERGED") {
					return {
						content: [{ type: "text", text: `PR #${status.number} is already merged.` }],
						details: { prNumber: status.number, status: "merged" },
					};
				}

				if (status.state === "CLOSED") {
					return {
						content: [{ type: "text", text: `PR #${status.number} was closed without merging.` }],
						details: { prNumber: status.number, status: "closed" },
						isError: true,
					};
				}

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

				const checksResult = await pi.exec(
					"gh",
					["pr", "checks", pr_url, "--json", "name,state,bucket"],
					{ signal },
				);

				let checks: { name: string; state: string; bucket: string }[] = [];
				if (checksResult.code === 0) {
					try {
						checks = JSON.parse(checksResult.stdout);
					} catch {
						/* ignore parse errors */
					}
				}

				const failedChecks = checks.filter((c) => c.bucket === "fail");
				if (failedChecks.length > 0) {
					const failedNames = failedChecks.map((c) => c.name);
					const allChecksStatus = checks
						.map((c) => `- ${c.name}: ${c.bucket}`)
						.join("\n");
					return {
						content: [
							{
								type: "text",
								text: `PR #${status.number} has failing CI checks:\n\n**Failed:**\n${failedNames.map((n) => `- ${n}`).join("\n")}\n\n**All checks:**\n${allChecksStatus}\n\nInvestigate the failures, fix the code, commit, and push. Then call \`ralph_poll_pr\` again.`,
							},
						],
						details: {
							prNumber: status.number,
							status: "checks_failed",
							failedChecks: failedNames,
						},
					};
				}

				const passed = checks.filter((c) => c.bucket === "pass").length;
				const pending = checks.filter((c) => c.bucket === "pending").length;
				const total = checks.length;
				const checksSummary = total > 0
					? ` (checks: ${passed}/${total} passed${pending > 0 ? `, ${pending} pending` : ""})`
					: "";

				onUpdate?.({
					content: [
						{
							type: "text",
							text: `Waiting for review on PR #${status.number}${checksSummary}... (poll ${poll + 1}/${MAX_POLLS})`,
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
