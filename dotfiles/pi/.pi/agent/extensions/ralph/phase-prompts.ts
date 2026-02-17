/**
 * Prompt content for ralph phases.
 *
 * - PHASE_SYSTEM_PROMPTS: injected via before_agent_start (use {{iteration}} placeholder)
 * - PHASE_MESSAGES: sent via sendUserMessage at the start of each phase
 * - PHASE_SUMMARY_INSTRUCTIONS: passed to navigateTree customInstructions after each phase
 * - ITERATION_SUMMARY_INSTRUCTIONS: passed to navigateTree after the final phase
 */

import type { Phase } from "./state.js";

// ── System prompts (injected into system prompt when ralph is active) ──────

export const PHASE_SYSTEM_PROMPTS: Record<Phase, string> = {
	plan: `## Ralph — Plan Phase (Iteration {{iteration}})

You are in the **plan** phase of the ralph autonomous development loop.

Task:
1. Read PROMPT.md in the current directory
2. Find the next unchecked step (\`- [ ]\`)
3. If ALL steps are checked (\`- [x]\`), call \`ralph_loop_done\` with a summary of all completed work
4. Otherwise:
   a. Note which step you're planning (quote it exactly)
   b. Read Goal, Context, Requirements, and Learnings sections for background
   c. Explore the codebase to understand the current state
   d. Create a detailed, actionable implementation plan (files, functions, tests, edge cases)
5. Call \`ralph_phase_done\` with your plan

Do NOT implement any changes — only create the plan. Implementation happens in the build phase.

CRITICAL: You MUST call either \`ralph_phase_done\` or \`ralph_loop_done\` to complete this phase.
After calling either tool, stop — do not make additional tool calls.`,

	build: `## Ralph — Build Phase (Iteration {{iteration}})

You are in the **build** phase. Implement the changes described in the plan summary above.

Task:
1. Follow the implementation plan from the plan phase summary
2. Write clean code following existing patterns and style
3. Run tests and verify the implementation works
4. Handle edge cases mentioned in the plan
5. Call \`ralph_phase_done\` with a summary of what was implemented

CRITICAL: You MUST call \`ralph_phase_done\` to complete this phase.
After calling it, stop — do not make additional tool calls.`,

	document: `## Ralph — Document Phase (Iteration {{iteration}})

You are in the **document** phase. Update documentation for the changes made.

Task:
1. Review what was changed (see build phase summary above)
2. Update README.md if public API or usage changed
3. Add inline code comments for complex logic
4. Update any other relevant documentation files
5. If no documentation updates are needed, explain why
6. Call \`ralph_phase_done\` with a summary of what was updated (or why nothing was needed)

CRITICAL: You MUST call \`ralph_phase_done\` to complete this phase.
After calling it, stop — do not make additional tool calls.`,

	commit: `## Ralph — Commit Phase (Iteration {{iteration}})

You are in the **commit** phase. Create a git branch and commit all changes.

Task:
1. Create and switch to a new branch: \`ralph/<short-description>\`
2. Stage and commit all changes
   - Read ~/.agents/skills/git-commit/SKILL.md for the commit workflow
   - Write a clear commit message that summarizes the changes
3. Call \`ralph_phase_done\` with the branch name and commit hash

CRITICAL: You MUST call \`ralph_phase_done\` to complete this phase.
After calling it, stop — do not make additional tool calls.`,

	pr: `## Ralph — PR Phase (Iteration {{iteration}})

You are in the **pr** phase. Push the branch and create a pull request.

Task:
1. Push the branch to remote
2. Create a pull request
   - Read ~/.agents/skills/github-pull-request/SKILL.md for the PR workflow
   - Include a clear title and description summarizing the changes
3. Call \`ralph_phase_done\` with the PR URL and PR number

CRITICAL: You MUST call \`ralph_phase_done\` to complete this phase.
After calling it, stop — do not make additional tool calls.`,

	wait_pr: `## Ralph — Wait PR Phase (Iteration {{iteration}})

You are in the **wait_pr** phase. Wait for PR review, handle feedback, and merge.

Task:
1. Use \`ralph_poll_pr\` with the PR URL to wait for review and CI checks
2. If CI checks fail:
   a. Read the failure details returned by ralph_poll_pr
   b. Investigate the failing checks (read logs, inspect code)
   c. Fix the issue
   d. Commit and push the fixes
   e. Call \`ralph_poll_pr\` again to continue waiting
3. If changes are requested:
   a. Read the review comments returned by ralph_poll_pr
   b. Make the requested code fixes
   c. Commit and push the fixes
   d. Call \`ralph_poll_pr\` again to continue waiting
4. Repeat steps 2-3 until the PR is approved and merged
5. Call \`ralph_phase_done\` with the final merge status

CRITICAL: You MUST call \`ralph_phase_done\` to complete this phase.
After calling it, stop — do not make additional tool calls.`,

	update_prompt: `## Ralph — Update PROMPT Phase (Iteration {{iteration}})

You are in the **update_prompt** phase. Update PROMPT.md with iteration results.

Task:
1. Switch to main and pull latest: \`git checkout main && git pull\`
2. Read PROMPT.md and update it:
   a. Check off the completed step: \`- [ ] Step\` → \`- [x] Step (iteration {{iteration}})\`
   b. Add any learnings or insights to the Learnings section
   c. Add a History entry:
      ### Iteration {{iteration}}: <Short Title>
      - **Branch**: ralph/<slug>
      - **PR**: #<number> (merged)
      - **Summary**: <What was done>
3. Commit and push: \`git add PROMPT.md && git commit -m "Update PROMPT.md: mark step complete (iteration {{iteration}})" && git push\`
4. Call \`ralph_phase_done\` with a summary of what was updated

CRITICAL: You MUST call \`ralph_phase_done\` to complete this phase.
After calling it, stop — do not make additional tool calls.`,
};

// ── User messages (sent via sendUserMessage at the start of each phase) ────

export const PHASE_MESSAGES: Record<Phase, string> = {
	plan: "Begin the **plan** phase. Read PROMPT.md and plan the next unchecked step. If all steps are complete, call `ralph_loop_done`.",
	build: "Begin the **build** phase. Implement the plan from the previous phase.",
	document: "Begin the **document** phase. Update documentation for the changes made.",
	commit: "Begin the **commit** phase. Create a new branch and commit all changes.",
	pr: "Begin the **pr** phase. Push the branch and create a pull request.",
	wait_pr: "Begin the **wait_pr** phase. Use `ralph_poll_pr` to wait for PR review, handle any feedback, and merge.",
	update_prompt: "Begin the **update_prompt** phase. Update PROMPT.md with the results of this iteration.",
};

// ── Summary instructions (passed to navigateTree customInstructions) ───────

export const PHASE_SUMMARY_INSTRUCTIONS: Record<Phase, string> = {
	plan: "Focus on: which step from PROMPT.md is being planned, the detailed implementation plan, files and modules involved, key design decisions.",
	build: "Focus on: files created or modified, implementation approach, test results, any deviations from the plan.",
	document: "Focus on: which documentation files were updated, key changes made, or why no updates were needed.",
	commit: "Focus on: branch name, commit hash, commit message summary.",
	pr: "Focus on: PR URL, PR number, PR title and description summary.",
	wait_pr: "Focus on: final merge status, any review comments received and how they were addressed, number of fix rounds.",
	update_prompt:
		"Focus on: which step was checked off in PROMPT.md, what was added to the History section, any learnings recorded.",
};

export const ITERATION_SUMMARY_INSTRUCTIONS =
	"Summarize the entire iteration concisely. Include: which PROMPT.md step was completed, key implementation changes, branch name, PR number, merge status, and any important learnings.";
