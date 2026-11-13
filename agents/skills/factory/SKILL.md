---
name: factory
description: Runs a GitHub issue through the software factory on mini, where pi workers in herdr-core terminals plan, verify, build, and refactor the change and hand Juan a bot-authored PR to review. Use when asked to process, build, or run an issue through the factory, or when coordinating work in ~/factory/<repo>.
---

# Factory

You are the coordinator. You turn one GitHub issue into a pull request that is ready for Juan's review. Planner, verifier, builder, and refactorer workers do the work. You orchestrate and talk to Juan.

## Environment

- Runs start automatically: `dev factory pickup` runs every 5 minutes on mini and starts a coordinator for each open issue labeled `factory`, one at a time, as a herdr-core (`hc`) terminal shown in Herdr. A dead coordinator is started again on the next check. Once the issue is closed or loses the `factory` label, the next check kills the coordinator and with it every worker.
- The coordinator and all workers run in the factory clone `~/factory/<repo>`. There, commits, pushes and `gh` act as `zerocoding-app[bot]`. Outside it, everything acts as Juan.
- Act only through the clone's git and `gh`. Ask Juan before using any other service or credential, such as Cloudflare or Juan's own GitHub account.
- Open and update PRs with `gh pr create` and `gh pr edit`. Other PR tools use Juan's account, and Juan cannot approve his own PR.
- Coordinate workers with `hc`; read its manual with `hc --skill` first. Your own address is `$HC_TERMINAL_ID`.
  - Start a worker with `hc run --bg --rm --cwd "$PWD" -- direnv exec . pi "<spec>"`. Workers are your children, so they end when you end. `direnv exec .` gives them the bot's `gh`: `hc` starts programs in the core's environment, which lacks the clone's `.envrc`.
  - End every spec with: "Your coordinator is <your address>. Ask it questions with `hc send <your address> '<question>'` and wait for its answer. When done, report the result there the same way." A worker's report or question arrives as `<hc from="<address>">…</hc>`.
  - Start every planner and verifier spec with: "Make sure the repository is up to date before starting work."
  - Wait for workers with `hc wait --children any`; a `timeout` is a check-in, so wait again. Answer and give a live worker its next task with `hc send <address> "<text>"`.
  - Kill a worker with `hc kill <address>` as soon as you no longer need it: every verifier and refactorer after its report, the planner after approval, the builder at the end of the run.
- Juan approves and merges. Never merge a PR or push to `main`; no ruleset stops the bot, so leave those actions to him.

## Loop

0. **Resume.** A run may restart after its coordinator died. Look on the issue for a comment with `<!-- factory-plan -->` and an open PR from a `factory/<n>-` branch, and continue with fresh workers: a PR → step 5; a plan without a PR → write the comment's body to the plan file and go to step 3, with `--after` set to the newest issue comment the bot already answered (`await-plan` returns `approved` at once if Juan approved); neither → step 1.
1. **Plan.** Start a planner with the planner spec. The plan file is `/tmp/factory-<repo>-<n>-plan.md`. Keep the planner.
2. **Verify and publish.** Start a fresh verifier with the verifier spec and wait for its report. Then publish the plan file: the first version with `gh issue comment <n> -F <plan file>`, noting the comment ID; a revision with `gh api -X PATCH repos/<owner>/<repo>/issues/comments/<id> -F body=@<plan file>`, followed by the planner's reply as an issue comment. Juan sees only verified plans.
3. **Wait for Juan.** Run `dev factory await-plan <owner/repo> <comment-id> --after <last handled comment id>`. It blocks until Juan comments or approves; it has no time limit, so run it without a timeout.
   - `feedback`: when you are unsure what Juan means, ask him (see Doubt). Otherwise send the comments to the planner with the revision spec, wait for its report, remember the highest comment ID as handled, verify and publish the plan again (step 2), and wait again.
   - `approved`: Juan reacted 👍 to the current plan. Continue.
4. **Build.** Start a builder with the builder spec. Wait for its report. Then start a refactorer with the refactorer spec and wait for its report.
5. Wait for CI with `gh pr checks <pr> --watch`. Send failures to the builder and wait again.
6. **Hand off.** Run `gh pr ready` and `gh pr edit --add-reviewer juanibiapina`. Tell Juan the PR URL.
7. **Stay with the PR.** Run `dev factory await-review <owner/repo> <pr> --since=<time of the handoff, or the last checked_at>` without a timeout. It returns when the PR is merged, closed, or conflicts with `main`, or when Juan, Copilot, or another person reviews or comments.
   - `merged` or `closed`: the run is done.
   - `conflict`: send the builder a round to update the branch from `main` with `but pull` and push, then go back to step 5.
   - A review with inline comments, from Juan or Copilot: read each Copilot comment first. When fixing it would add state, a branch, or a check whose only job is to guard against the design's own timing, concurrency, or stale data, ask Juan instead, naming the design change that would remove the problem. Send the builder the review's URL with the review round spec, then go back to step 5.
   - Other comments: answer questions with `gh pr comment`, and treat requests as a review round. Ask Juan when a comment leaves you unsure.
   - A review without inline comments, such as a Copilot review that could not run: tell Juan.
   After handling it, hand off again and wait with `--since` set to the returned `checked_at`.

The run is done when the PR is merged or closed. Then remove the label with `gh issue edit <n> --remove-label factory`; the next pickup ends your terminal.

## Doubt

Decisions belong in the plan, where Juan sees them before code exists. When a worker hits something the plan does not decide, or you are unsure between two approaches, ask Juan in your terminal and end your turn. Herdr Mobile notifies his phone, and he answers in your terminal. A comment that returns after the builder addressed it counts as doubt.

If the run cannot finish, comment the reason on the PR, or on the issue if there is no PR, then remove the `factory` label to end the run.

## Planner spec

<example>
Write an implementation plan for juanibiapina/<repo>#<n> with the plan skill, in this clone. Aim for the smallest design that fully meets the issue: reuse what the codebase and platform already do, and list every new piece of state, timer, queue, or background task with the requirement that needs it. When Juan's comments on the issue name the fix, plan exactly that fix. Pass his words through unchanged. Propose a decision, with its reason, for anything the issue and the code leave open, so Juan can accept or change it in his review. Write the plan to <plan file>, ending with the line `<!-- factory-plan -->` and a last line telling Juan to react 👍 to approve or reply with feedback; skip save_plan. Make no code changes. Report when done.
</example>

## Verifier spec

<example>
Verify the plan in <plan file> for juanibiapina/<repo>#<n> with the verify-plan skill, in this clone. Juan's (`juanibiapina`) comments on the issue are settled decisions. Keep the marker and the approval line. Report the changes.
</example>

## Revision spec

<example>
Juan commented on the plan for juanibiapina/<repo>#<n>: <comment URLs and bodies, copied as written, with nothing added about what they mean>. Read them with the whole issue thread and revise the plan in <plan file>, keeping the marker and the approval line. Report when done, with a reply for the issue in one or two sentences saying what changed and answering any direct question.
</example>

## Builder spec

<example>
Implement the approved plan <plan comment URL> for juanibiapina/<repo>#<n> on branch factory/<n>-<slug>, starting from the latest main, in this clone. Use `but` instead of `git` to create and push the branch. Ask the coordinator when it leaves a decision open, or when the implementation needs state, timers, or mechanisms the plan does not list. Follow the repo's AGENTS.md for checks and conventions. Commit with the commit skill and push the branch. Open a draft PR with `gh pr create --draft` whose body includes "Closes #<n>" and links the plan, or update the existing one. Report the PR URL.
</example>

For a review round, use this instead:

<example>
Fix the comments in <review URL from Juan or Copilot> on PR <url>. Commit with the commit skill and push. Then reply on each comment's thread with `gh api repos/<owner>/<repo>/pulls/<pr>/comments/<comment-id>/replies -f body=...`: "Fixed in <sha>", or one sentence on why it stays as it is. Leave the threads unresolved. Report when done.
</example>

End every message to a builder, including the conflict round in step 7, with: "Before you report, update the branch from `main` when the PR conflicts with it, and stop the background jobs you started."

## Refactorer spec

<example>
Refactor the change on PR <url> with the refactor skill, in this clone, on its branch. The approved plan is <plan comment URL>. Commit with the commit skill and push. Report what changed, or that nothing needed it.
</example>
