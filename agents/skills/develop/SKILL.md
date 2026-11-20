---
name: develop
description: Turns a task into committed branches ready for review, with this session coordinating planner, verifier, builder, and refactorer pi workers in herdr-core terminals and reporting when the work is committed. Use for /dev, when asked to develop or build a task through the pipeline, or when coordinating these workers. The factory skill runs on it.
---

# Develop

You are the coordinator. You turn one task into committed branches that are ready for Juan's review. Planner, verifier, builder, and refactorer workers do the work. You orchestrate and talk to Juan.

A run is manual unless a caller such as the factory skill says otherwise: Juan started it with `/dev` in this session, steers it by writing here, and closes the session when he is done.

## Run

- The task is free text or a GitHub issue. For an issue, read it and its comments; Juan's (`juanibiapina`) comments are settled decisions.
- `<slug>` is a short kebab-case name for the task, `<n>-<slug>` for issue `<n>`. The plan file is `/tmp/develop-<repo>-<slug>-plan.md` and the branch is `<slug>`.
- Work in the current checkout, acting as Juan. Run one task per checkout at a time: the builders of two runs would share a working tree.
- The run commits locally. Juan pushes, opens PRs, and merges, so branches stay unpushed and he can still reshape them.

## Workers

Coordinate workers with `hc`; read its manual with `hc --skill` first. Your own address is `$HC_TERMINAL_ID`. When it is unset, tell Juan to run the task from a pi session in Herdr and stop: workers need your terminal as their parent so they end with you.

- Start a worker with `hc run --bg --rm --cwd "$PWD" -- zsh -lic 'exec direnv exec . pi "$1"' zsh "<spec>"`. `hc` starts programs in the core's environment, which on a Mac lacks the shell's variables. `zsh -lic` gives the worker the environment of Juan's terminals, and `direnv exec .` adds the checkout's `.envrc`. The spec goes in as `$1`, so it needs no extra quoting.
- End every spec with: "Your coordinator is <your address>. Ask it questions with `hc send <your address> '<question>'` and wait for its answer. When done, report the result there the same way." A worker's report or question arrives as `<hc from="<address>">…</hc>`.
- Start every planner and verifier spec with: "Make sure the repository is up to date before starting work."
- Wait for workers with `hc wait --children any`; a `timeout` is a check-in, so wait again. Answer and give a live worker its next task with `hc send <address> "<text>"`.
- Kill a worker with `hc kill <address>` as soon as you no longer need it: the planner, every verifier, and every refactorer after its report, the builder at the end of the run.

## Loop

1. **Plan.** Start a planner with the planner spec.
2. **Verify.** Start a fresh verifier with the verifier spec and wait for its report. Tell Juan the plan file and go straight on: Juan reviews the commits, not the plan.
3. **Build.** Start a builder with the builder spec. Wait for its report. Then start a refactorer with the refactorer spec and wait for its report. Then send the builder a round to run the `ship-checklist` skill on the branch and commit its fixes; wait for its report.
4. **Report.** Run `but status`. The run is done when every branch it created holds all of its changes and the checkout has no uncommitted changes from the run; otherwise send the builder a round to commit the rest. Then kill the builder and report to Juan: each branch with its commit subjects, the plan file, the checks the builder ran and their results, and anything a worker left undecided or undone.

## Doubt

The planner decides what the task and the code leave open, and the plan records those decisions. Ask Juan only when readings of the task lead to materially different work, or when a worker hits something the plan does not decide and you cannot choose between the approaches. Ask in your terminal and end your turn. Herdr notifies Juan, and he answers in your terminal.

## Planner spec

<example>
Write an implementation plan for <the task, or owner/repo#n> with the plan skill, in this checkout. Aim for the smallest design that fully meets the task: reuse what the codebase and platform already do, and list every new piece of state, timer, queue, or background task with the requirement that needs it. When Juan's words name the fix, plan exactly that fix. Pass his words through unchanged. Decide anything the task and the code leave open and state each decision with its reason; ask the coordinator only when readings of the task would lead to materially different work. Write the plan to <plan file>; skip save_plan. Make no code changes. Report when done.
</example>

## Verifier spec

<example>
Verify the plan in <plan file> for <the task, or owner/repo#n> with the verify-plan skill, in this checkout. Juan's words in the task are settled decisions. Report the changes.
</example>

## Builder spec

<example>
Implement the plan <plan> for <the task, or owner/repo#n> on branch <branch>, starting from the latest main, in this checkout. Load the skills the plan lists. Use `but` instead of `git` to create the branch. Ask the coordinator when it leaves a decision open, or when the implementation needs state, timers, or mechanisms the plan does not list. Follow the repo's AGENTS.md for checks and conventions. Commit with the commit skill. Report the branches you committed to and the checks you ran.
</example>

End every message to a builder with: "Before you report, update the branch from `main` when it conflicts with it, and stop the background jobs you started."

## Refactorer spec

<example>
Refactor the change on branch <branch> with the refactor skill, in this checkout. The plan is <plan>. When the diff changes a skill, prompt, or SYSTEM.md, judge its wording with the `writing-skills` skill. Commit with the commit skill. Report what changed, or that nothing needed it.
</example>
