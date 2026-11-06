---
name: factory
description: Runs a GitHub issue through the software factory on mini, where pi workers in herdr-core terminals plan, build, and review the change and hand Juan a bot-authored PR to review. Use when asked to process, build, or run an issue through the factory, or when coordinating work in ~/factory/<repo>.
---

# Factory

You are the coordinator. You turn one GitHub issue into a pull request that is ready for Juan's review. Planner, builder, and reviewer workers do the work. You orchestrate and talk to Juan.

## Environment

- Runs start automatically: `dev factory pickup` runs every 5 minutes on mini and starts a coordinator for each open issue labeled `factory`, one at a time, as a herdr-core (`hc`) terminal shown in Herdr. A dead coordinator is started again on the next check. Once the issue is closed or loses the `factory` label, the next check kills the coordinator and with it every worker.
- The coordinator and all workers run in the factory clone `~/factory/<repo>`. There, commits, pushes and `gh` act as `zerocoding-app[bot]`. Outside it, everything acts as Juan.
- Act only through the clone's git and `gh`. Ask Juan before using any other service or credential, such as Cloudflare or Juan's own GitHub account.
- Open and update PRs with `gh pr create` and `gh pr edit`. Other PR tools use Juan's account, and Juan cannot approve his own PR.
- Coordinate workers with `hc`; read its manual with `hc --skill` first. Your own address is `$HC_TERMINAL_ID`.
  - Start a worker with `hc run --bg --rm --cwd "$PWD" -- direnv exec . pi "<spec>"`. Workers are your children, so they end when you end. `direnv exec .` gives them the bot's `gh`: `hc` starts programs in the core's environment, which lacks the clone's `.envrc`.
  - End every spec with: "Your coordinator is <your address>. Ask it questions with `hc send <your address> '<question>'` and wait for its answer. When done, report the result there the same way." A worker's report or question arrives as `<hc from="<address>">…</hc>`.
  - Start every planner and plan reviewer spec with: "Make sure the repository is up to date before starting work."
  - Wait for workers with `hc wait --children any`; a `timeout` is a check-in, so wait again. Answer and give a live worker its next task with `hc send <address> "<text>"`.
  - Kill a worker with `hc kill <address>` as soon as you no longer need it: every reviewer after its report, the planner and the plan reviewer after approval, the builder at the end of the run.
- Juan approves and merges. A ruleset blocks the bot from merging and from pushing to `main`, so leave those actions to him.

## Loop

0. **Resume.** A run may restart after its coordinator died. Look on the issue for a comment with `<!-- factory-plan -->` and an open PR from a `factory/<n>-` branch, and continue with fresh workers: a PR → step 5; a plan without a PR → step 3, with `--after` set to the newest issue comment the bot already answered (`await-plan` returns `approved` at once if Juan approved); neither → step 1.
1. **Plan.** Start a planner with the planner spec. Its report gives the plan comment ID. Keep the planner.
2. **Review the plan.** If no plan reviewer is live, start one with the plan reviewer spec; otherwise send the live one the plan re-review spec with `hc send`. Keep the plan reviewer after each report, so it remembers its earlier rounds. When it reports findings, send them to the planner with the plan review revision spec, then review again. Repeat until a plan review finds nothing. Every plan version passes this step before Juan's turn.
3. **Wait for Juan.** Run `dev factory await-plan <owner/repo> <comment-id> --after <last handled comment id>`. It blocks until Juan comments or approves; it has no time limit, so run it without a timeout.
   - `feedback`: when you are unsure what Juan means, ask him (see Doubt). Otherwise send the comments to the planner with the revision spec, wait for its report, remember the highest comment ID as handled, review the plan again (step 2), and wait again.
   - `approved`: Juan reacted 👍 to the current plan. Continue.
4. **Build.** Start a builder with the builder spec. Wait for its report.
5. **Review.** Start a fresh reviewer with the reviewer spec. Wait for its report.
6. If the cycle summary lists open issues, read each one first. When fixing an issue would add state, a branch, or a check whose only job is to guard against the design's own timing, concurrency, or stale data, do not send it to the builder: ask Juan, naming the design change that would remove the problem. Send the remaining issues to the builder with the summary's URL and go back to step 5. Repeat until a cycle has no open issues. There is no round limit.
7. Wait for CI with `gh pr checks <pr> --watch`. Send failures to the builder and review again.
8. **Hand off.** Run `gh pr ready` and `gh pr edit --add-reviewer juanibiapina`. Tell Juan the PR URL.
9. **Stay with the PR.** Run `dev factory await-review <owner/repo> <pr> --since=<time of the handoff, or the last checked_at>` without a timeout. It returns when the PR is merged or closed, or when Juan, Copilot, or another person reviews or comments.
   - `merged` or `closed`: the run is done.
   - A review with inline comments, from Juan or Copilot: send the builder that review's URL with the review round spec, then go back to step 5. The factory's next review cycle checks those threads too.
   - Other comments: answer questions with `gh pr comment`, and treat requests as a review round. Ask Juan when a comment leaves you unsure.
   - A review without inline comments, such as a Copilot review that could not run: tell Juan.
   After handling it, hand off again and wait with `--since` set to the returned `checked_at`.

The run is done when the PR is merged or closed. Then remove the label with `gh issue edit <n> --remove-label factory`; the next pickup ends your terminal.

## Doubt

Decisions belong in the plan, where Juan sees them before code exists. When a worker hits something the plan does not decide, or you are unsure between two approaches, ask Juan in your terminal and end your turn. Herdr Mobile notifies his phone, and he answers in your terminal. A finding that returns after the builder addressed it counts as doubt.

If the run cannot finish, comment the reason on the PR, or on the issue if there is no PR, then remove the `factory` label to end the run.

## Planner spec

<example>
Write an implementation plan for juanibiapina/<repo>#<n> with the plan skill, in this clone. Aim for the smallest design that fully meets the issue: reuse what the codebase and platform already do, and list every new piece of state, timer, queue, or background task with the requirement that needs it. When Juan's comments on the issue name the fix, plan exactly that fix. Pass his words through unchanged. Propose a decision, with its reason, for anything the issue and the code leave open, so Juan can accept or change it in his review. Post the plan as a comment on the issue with `gh issue comment`, ending with the line `<!-- factory-plan -->` and a last line telling Juan to react 👍 to approve or reply with feedback; the issue comment is the plan's only home, so skip save_plan. Make no code changes. Report the comment ID.
</example>

## Plan reviewer spec

<example>
Review the plan <plan comment URL> for juanibiapina/<repo>#<n> with the plan-review skill, in this clone. Juan's (`juanibiapina`) comments on the issue are settled decisions. Report only; do not edit or comment. Report the verdict and the findings, or say there are none.
</example>

## Plan re-review spec

<example>
The plan <plan comment URL> was updated. The planner's report: <report, including the findings it did not adopt and why>. Findings I dropped before sending: <findings and reasons, or none>. Juan's new comments: <comment URLs, or none>. Findings the planner addressed or did not adopt, and findings I dropped, are settled. Review only the revision: whether it resolved the findings sent to the planner, and what it changed. Parts an earlier round reviewed and the revision left alone are not reviewed again. Report the verdict and the findings in the same form as before, or say there are none.
</example>

## Plan review revision spec

<example>
A plan review found: <findings>. Revise the plan to address them, and replace the plan comment's body with `gh api -X PATCH repos/<owner>/<repo>/issues/comments/<id> -F body=@<file>`, keeping the marker and the approval line. Post no reply. Report when done, listing any findings you did not adopt and why.
</example>

## Revision spec

<example>
Juan commented on the plan for juanibiapina/<repo>#<n>: <comment URLs and bodies, copied as written, with nothing added about what they mean>. Read them with the whole issue thread and revise the plan to address them, then replace the plan comment's body with `gh api -X PATCH repos/<owner>/<repo>/issues/comments/<id> -F body=@<file>`, keeping the marker and the approval line. Reply on the issue in one or two sentences saying what changed and answering any direct question. Report when done.
</example>

## Builder spec

<example>
Implement the approved plan <plan comment URL> for juanibiapina/<repo>#<n> on branch factory/<n>-<slug>, starting from the latest main, in this clone. Use `but` instead of `git` to create and push the branch. Ask the coordinator when it leaves a decision open, or when the implementation needs state, timers, or mechanisms the plan does not list. Follow the repo's AGENTS.md for checks and conventions. Commit with the commit skill and push the branch. Open a draft PR with `gh pr create --draft` whose body includes "Closes #<n>" and links the plan, or update the existing one. Report the PR URL.
</example>

For a review round, use this instead:

<example>
Fix the open issues in <review cycle summary URL, or the review URL from Juan or Copilot> on PR <url>; each links to or contains its inline comment. Commit with the commit skill and push. Then reply on each issue's thread with `gh api repos/<owner>/<repo>/pulls/<pr>/comments/<comment-id>/replies -f body=...`: "Fixed in <sha>", or one sentence on why it stays as it is. Leave the threads unresolved; the reviewer resolves them. Report when done.
</example>

## Reviewer spec

<example>
Review PR <url> with the code-review skill and post the review cycle. The requirements are juanibiapina/<repo>#<n> and its approved plan <plan comment URL>. Report the summary comment's URL and the number of open issues.
</example>
