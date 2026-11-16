---
name: develop
description: Turns a task into a pull request ready for review, with this session coordinating planner, verifier, builder, and refactorer pi workers in herdr-core terminals and staying with the PR through review. Use for /dev, when asked to develop or build a task through the pipeline, or when coordinating these workers. The factory skill runs on it.
---

# Develop

You are the coordinator. You turn one task into a pull request that is ready for Juan's review. Planner, verifier, builder, and refactorer workers do the work. You orchestrate and talk to Juan.

A run is manual unless a caller such as the factory skill says otherwise: Juan started it with `/dev` in this session, steers it by writing here, and closes the session when he is done.

## Run

- The task is free text or a GitHub issue. For an issue, read it and its comments; Juan's (`juanibiapina`) comments are settled decisions.
- `<slug>` is a short kebab-case name for the task, `<n>-<slug>` for issue `<n>`. The plan file is `/tmp/develop-<repo>-<slug>-plan.md` and the branch is `<slug>`.
- Work in the current checkout, acting as Juan. Run one task per checkout at a time: the builders of two runs would share a working tree.
- Juan approves and merges. Never merge a PR or push to `main`.

## Workers

Coordinate workers with `hc`; read its manual with `hc --skill` first. Your own address is `$HC_TERMINAL_ID`. When it is unset, tell Juan to run the task from a pi session in Herdr and stop: workers need your terminal as their parent so they end with you.

- Start a worker with `hc run --bg --rm --cwd "$PWD" -- direnv exec . pi "<spec>"`. `hc` starts programs in the core's environment; `direnv exec .` gives them the checkout's `.envrc`.
- End every spec with: "Your coordinator is <your address>. Ask it questions with `hc send <your address> '<question>'` and wait for its answer. When done, report the result there the same way." A worker's report or question arrives as `<hc from="<address>">…</hc>`.
- Start every planner and verifier spec with: "Make sure the repository is up to date before starting work."
- Wait for workers with `hc wait --children any`; a `timeout` is a check-in, so wait again. Answer and give a live worker its next task with `hc send <address> "<text>"`.
- Kill a worker with `hc kill <address>` as soon as you no longer need it: the planner, every verifier, and every refactorer after its report, the builder at the end of the run.

## Loop

1. **Plan.** Start a planner with the planner spec.
2. **Verify.** Start a fresh verifier with the verifier spec and wait for its report. Tell Juan the plan file and go straight on: Juan reviews the PR, not the plan.
3. **Build.** Start a builder with the builder spec. Wait for its report. Then start a refactorer with the refactorer spec and wait for its report. Then send the builder the PR spec and wait for the PR URL. The PR opens only after the refactor, so its first version is the reviewed one.
4. Wait for CI with `gh pr checks <pr> --watch`. Send failures to the builder and wait again.
5. **Hand off.** Run `gh pr ready`. Tell Juan the PR URL.
6. **Stay with the PR.** Run `dev github await-review <owner/repo> <pr> --since=<time of the handoff, or the last checked_at> --timeout=600`. It returns when the PR is merged, closed, or conflicts with `main`, when someone other than the PR's author or a bot reviews or comments, or after the timeout. Juan's messages reach you between waits.
   - `timeout`: wait again with the same `--since`.
   - `merged` or `closed`: the run is done.
   - `conflict`: send the builder a round to update the branch from `main` with `but pull` and push, then go back to step 4.
   - A review with inline comments, from Juan or Copilot: read each Copilot comment first. When fixing it would add state, a branch, or a check whose only job is to guard against the design's own timing, concurrency, or stale data, ask Juan instead, naming the design change that would remove the problem. Send the builder the review's URL with the review round spec, then go back to step 4.
   - Other comments: answer questions with `gh pr comment`, and treat requests as a review round. Ask Juan when a comment leaves you unsure.
   - A review without inline comments, such as a Copilot review that could not run: tell Juan.
   After handling it, hand off again and wait with `--since` set to the returned `checked_at`.

The run is done when the PR is merged or closed. Then kill the builder and tell Juan.

## Doubt

The planner decides what the task and the code leave open, and the plan records those decisions. Ask Juan only when readings of the task lead to materially different work, or when a worker hits something the plan does not decide and you cannot choose between the approaches. Ask in your terminal and end your turn. Herdr notifies Juan, and he answers in your terminal. A comment that returns after the builder addressed it counts as doubt.

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
Implement the plan <plan> for <the task, or owner/repo#n> on branch <branch>, starting from the latest main, in this checkout. Use `but` instead of `git` to create and push the branch. Ask the coordinator when it leaves a decision open, or when the implementation needs state, timers, or mechanisms the plan does not list. Follow the repo's AGENTS.md for checks and conventions. Commit with the commit skill and push the branch. Report when done.
</example>

After the refactor, send the builder this:

<example>
Open a draft PR for branch <branch> with `gh pr create --draft`, whose body includes "Closes #<n>" when the task is an issue, or update the existing one. Report the PR URL.
</example>

For a review round, use this instead:

<example>
Fix the comments in <review URL> on PR <url>. Commit with the commit skill and push. Then reply on each comment's thread with `gh api repos/<owner>/<repo>/pulls/<pr>/comments/<comment-id>/replies -f body=...`: "Fixed in <sha>", or one sentence on why it stays as it is. Leave the threads unresolved. Report when done.
</example>

End every message to a builder, including the conflict round in step 6, with: "Before you report, update the branch from `main` when it conflicts with it, and stop the background jobs you started."

## Refactorer spec

<example>
Refactor the change on branch <branch> with the refactor skill, in this checkout. The plan is <plan>. Commit with the commit skill and push. Report what changed, or that nothing needed it.
</example>
