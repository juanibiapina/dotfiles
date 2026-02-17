/**
 * L2 iteration extension — loaded into iteration sub-sessions via `pi -p -e iteration.ts`.
 *
 * Registers phase tools that the L2 LLM calls in order:
 *   ralph_plan → ralph_build → ralph_document → ralph_commit →
 *   ralph_pr → ralph_wait_pr → ralph_update_prompt
 *
 * Each tool (except ralph_wait_pr) spawns an L3 sub-session via runPhase().
 * ralph_wait_pr polls `gh` CLI and spawns fix sub-sessions on CHANGES_REQUESTED.
 */

import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
	PLAN_PHASE_PROMPT,
	BUILD_PHASE_PROMPT,
	DOCUMENT_PHASE_PROMPT,
	PR_FIX_PHASE_PROMPT,
	UPDATE_PROMPT_PHASE_PROMPT,
} from "./phase-prompts.js";
import { runPhase } from "./runner.js";

const GIT_COMMIT_SKILL = path.join(os.homedir(), ".agents", "skills", "git-commit", "SKILL.md");
const GITHUB_PR_SKILL = path.join(os.homedir(), ".agents", "skills", "github-pull-request", "SKILL.md");

/** Parse the L2 session file path to extract the session directory and iteration number */
function parseSessionInfo(sessionFile: string): { dir: string; iteration: number } {
	const basename = path.basename(sessionFile, ".jsonl");
	const match = basename.match(/^iter-(\d+)$/);
	return {
		dir: path.dirname(sessionFile),
		iteration: match ? parseInt(match[1], 10) : 1,
	};
}

export default function (pi: ExtensionAPI) {
	let sessionDir = "";
	let iteration = 1;
	let fixCount = 0;

	// Derive session directory and iteration from our own session file
	pi.on("session_start", async (_event, ctx) => {
		const sessionFile = ctx.sessionManager.getSessionFile();
		if (sessionFile) {
			const info = parseSessionInfo(sessionFile);
			sessionDir = info.dir;
			iteration = info.iteration;
		}
	});

	/** Construct L3 session file path for a given phase */
	function phaseSession(phase: string): string {
		return path.join(sessionDir, `iter-${iteration}-${phase}.jsonl`);
	}

	// ── ralph_plan ─────────────────────────────────────────────────────────────

	pi.registerTool({
		name: "ralph_plan",
		label: "Plan",
		description:
			"Read PROMPT.md and plan the next implementation step. Returns a detailed plan, or RALPH_DONE if all steps are complete.",
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, signal, _onUpdate, ctx) {
			const result = await runPhase({
				sessionFile: phaseSession("plan"),
				cwd: ctx.cwd,
				message:
					"Read PROMPT.md and plan the next unchecked step. If all steps are complete, output exactly RALPH_DONE.",
				systemPrompt: PLAN_PHASE_PROMPT,
				signal,
			});

			return {
				content: [{ type: "text", text: result.output || "(no output)" }],
				details: { exitCode: result.exitCode, phase: "plan" },
				isError: result.exitCode !== 0,
			};
		},
	});

	// ── ralph_build ────────────────────────────────────────────────────────────

	pi.registerTool({
		name: "ralph_build",
		label: "Build",
		description: "Implement the plan from the planning phase.",
		parameters: Type.Object({
			plan: Type.String({ description: "The detailed implementation plan to execute" }),
		}),
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const result = await runPhase({
				sessionFile: phaseSession("build"),
				cwd: ctx.cwd,
				message: `Implement this plan:\n\n${params.plan}`,
				systemPrompt: BUILD_PHASE_PROMPT,
				signal,
			});

			return {
				content: [{ type: "text", text: result.output || "(no output)" }],
				details: { exitCode: result.exitCode, phase: "build" },
				isError: result.exitCode !== 0,
			};
		},
	});

	// ── ralph_document ─────────────────────────────────────────────────────────

	pi.registerTool({
		name: "ralph_document",
		label: "Document",
		description: "Update documentation based on changes from the build phase.",
		parameters: Type.Object({
			summary: Type.String({ description: "Summary of changes that were made" }),
		}),
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const result = await runPhase({
				sessionFile: phaseSession("doc"),
				cwd: ctx.cwd,
				message: `Update documentation for these changes:\n\n${params.summary}`,
				systemPrompt: DOCUMENT_PHASE_PROMPT,
				signal,
			});

			return {
				content: [{ type: "text", text: result.output || "(no output)" }],
				details: { exitCode: result.exitCode, phase: "document" },
				isError: result.exitCode !== 0,
			};
		},
	});

	// ── ralph_commit ───────────────────────────────────────────────────────────

	pi.registerTool({
		name: "ralph_commit",
		label: "Commit",
		description: "Create a git branch and commit all changes.",
		parameters: Type.Object({
			branch: Type.String({ description: 'Branch name (e.g. "ralph/add-user-auth")' }),
			summary: Type.String({ description: "Summary of changes for the commit message" }),
		}),
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const result = await runPhase({
				sessionFile: phaseSession("commit"),
				cwd: ctx.cwd,
				message: [
					`Create a new git branch and switch to it: git checkout -b ${params.branch}`,
					"",
					"Then commit all changes.",
					"",
					`Summary of what was done: ${params.summary}`,
				].join("\n"),
				noExtensions: true,
				noSkills: false,
				noPromptTemplates: true,
				skills: [GIT_COMMIT_SKILL],
				signal,
			});

			return {
				content: [{ type: "text", text: result.output || "(no output)" }],
				details: { exitCode: result.exitCode, phase: "commit" },
				isError: result.exitCode !== 0,
			};
		},
	});

	// ── ralph_pr ───────────────────────────────────────────────────────────────

	pi.registerTool({
		name: "ralph_pr",
		label: "Pull Request",
		description: "Push the branch and create a pull request.",
		parameters: Type.Object({
			branch: Type.String({ description: "Branch name to push" }),
			summary: Type.String({ description: "Summary for the PR title and description" }),
		}),
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const result = await runPhase({
				sessionFile: phaseSession("pr"),
				cwd: ctx.cwd,
				message: [
					`Push branch "${params.branch}" to the remote and create a pull request.`,
					"",
					`Summary: ${params.summary}`,
				].join("\n"),
				noExtensions: true,
				noSkills: false,
				noPromptTemplates: true,
				skills: [GITHUB_PR_SKILL],
				signal,
			});

			return {
				content: [{ type: "text", text: result.output || "(no output)" }],
				details: { exitCode: result.exitCode, phase: "pr" },
				isError: result.exitCode !== 0,
			};
		},
	});

	// ── ralph_wait_pr ──────────────────────────────────────────────────────────

	pi.registerTool({
		name: "ralph_wait_pr",
		label: "Wait for PR",
		description: "Poll the PR for review approval, handle review comments, and merge when approved.",
		parameters: Type.Object({
			pr_url: Type.String({ description: "The PR URL to poll (from ralph_pr output)" }),
		}),
		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			const { pr_url } = params;
			const POLL_INTERVAL = 30_000;
			const MAX_POLLS = 120; // ~1 hour

			for (let poll = 0; poll < MAX_POLLS; poll++) {
				if (signal?.aborted) {
					return {
						content: [{ type: "text", text: "Aborted while waiting for PR." }],
						details: { phase: "wait_pr" },
						isError: true,
					};
				}

				// ── Poll PR status ──────────────────────────────────────────
				const prCheck = await pi.exec("gh", ["pr", "view", pr_url, "--json", "state,reviewDecision,number"], {
					signal,
				});

				if (prCheck.code !== 0) {
					return {
						content: [{ type: "text", text: `Failed to check PR status: ${prCheck.stderr}` }],
						details: { phase: "wait_pr" },
						isError: true,
					};
				}

				let status: { state: string; reviewDecision: string; number: number };
				try {
					status = JSON.parse(prCheck.stdout);
				} catch {
					return {
						content: [{ type: "text", text: `Failed to parse PR status: ${prCheck.stdout}` }],
						details: { phase: "wait_pr" },
						isError: true,
					};
				}

				// ── MERGED ──────────────────────────────────────────────────
				if (status.state === "MERGED") {
					return {
						content: [{ type: "text", text: `PR #${status.number} is already merged.` }],
						details: { phase: "wait_pr", merged: true, prNumber: status.number },
					};
				}

				// ── CLOSED ──────────────────────────────────────────────────
				if (status.state === "CLOSED") {
					return {
						content: [{ type: "text", text: `PR #${status.number} was closed without merging.` }],
						details: { phase: "wait_pr", prNumber: status.number },
						isError: true,
					};
				}

				// ── APPROVED → merge ────────────────────────────────────────
				if (status.reviewDecision === "APPROVED") {
					const mergeResult = await pi.exec(
						"gh",
						["pr", "merge", pr_url, "--merge", "--delete-branch"],
						{ signal },
					);

					if (mergeResult.code !== 0) {
						return {
							content: [{ type: "text", text: `Failed to merge PR: ${mergeResult.stderr}` }],
							details: { phase: "wait_pr", prNumber: status.number },
							isError: true,
						};
					}

					return {
						content: [{ type: "text", text: `PR #${status.number} approved and merged.` }],
						details: { phase: "wait_pr", merged: true, prNumber: status.number },
					};
				}

				// ── CHANGES_REQUESTED → fix and continue ────────────────────
				if (status.reviewDecision === "CHANGES_REQUESTED") {
					const reviewComments = await gatherReviewComments(pr_url, signal);

					fixCount++;
					onUpdate?.({
						content: [
							{
								type: "text",
								text: `Changes requested on PR #${status.number}. Spawning fix session ${fixCount}...`,
							},
						],
					});

					const fixResult = await runPhase({
						sessionFile: path.join(sessionDir, `iter-${iteration}-fix-${fixCount}.jsonl`),
						cwd: ctx.cwd,
						message: [
							"The PR received review comments requesting changes.",
							"Fix the issues, commit, and push.",
							"",
							"Review Comments:",
							reviewComments,
						].join("\n"),
						systemPrompt: PR_FIX_PHASE_PROMPT,
						signal,
					});

					if (fixResult.exitCode !== 0) {
						return {
							content: [{ type: "text", text: `Fix session failed: ${fixResult.output}` }],
							details: { phase: "wait_pr", prNumber: status.number },
							isError: true,
						};
					}

					onUpdate?.({
						content: [{ type: "text", text: `Fix applied. Continuing to poll PR #${status.number}...` }],
					});
					continue;
				}

				// ── Pending → wait and retry ────────────────────────────────
				onUpdate?.({
					content: [
						{ type: "text", text: `Waiting for review on PR #${status.number}... (poll ${poll + 1})` },
					],
				});

				await sleep(POLL_INTERVAL, signal);
			}

			return {
				content: [{ type: "text", text: `Timed out waiting for PR review after ${MAX_POLLS} polls.` }],
				details: { phase: "wait_pr" },
				isError: true,
			};
		},
	});

	// ── ralph_update_prompt ────────────────────────────────────────────────────

	pi.registerTool({
		name: "ralph_update_prompt",
		label: "Update PROMPT.md",
		description: "Update PROMPT.md with iteration results (check off step, add learnings, add history).",
		parameters: Type.Object({
			message: Type.String({
				description:
					"Iteration details: step completed, iteration number, branch name, PR number, summary, and any learnings",
			}),
		}),
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const result = await runPhase({
				sessionFile: phaseSession("update"),
				cwd: ctx.cwd,
				message: params.message,
				systemPrompt: UPDATE_PROMPT_PHASE_PROMPT,
				signal,
			});

			return {
				content: [{ type: "text", text: result.output || "(no output)" }],
				details: { exitCode: result.exitCode, phase: "update_prompt" },
				isError: result.exitCode !== 0,
			};
		},
	});

	// ── Helpers ────────────────────────────────────────────────────────────────

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
}
