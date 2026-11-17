---
name: factory
description: Runs a GitHub issue through the software factory on mini, where pi workers in herdr-core terminals plan, verify, build, and refactor the change and hand Juan a bot-authored PR to review. Use when asked to process, build, or run an issue through the factory, or when coordinating work in ~/factory/<repo>.
---

# Factory

A factory run is a run of the `develop` skill for one GitHub issue, `<n>`, that nobody started by hand. Load the `develop` skill and follow it as the coordinator, with the changes below. Where `develop` reports committed branches, the factory delivers a PR and stays with it until it is merged or closed.

## Environment

- Runs start automatically: `dev factory pickup` runs every 5 minutes on mini and starts a coordinator for each open issue labeled `factory`, one at a time, as a herdr-core (`hc`) terminal shown in Herdr. A dead coordinator is started again on the next check. Once the issue is closed or loses the `factory` label, the next check kills the coordinator and with it every worker.
- The coordinator and all workers run in the factory clone `~/factory/<repo>`. There, commits, pushes and `gh` act as `zerocoding-app[bot]`, through the clone's `.envrc`. Outside it, everything acts as Juan.
- Act only through the clone's git and `gh`. Ask Juan before using any other service or credential, such as Cloudflare or Juan's own GitHub account.
- Open and update PRs with `gh pr create` and `gh pr edit`. Other PR tools use Juan's account, and Juan cannot approve his own PR.
- Juan is away. Herdr Mobile notifies his phone when you ask, and he answers in your terminal.
- Juan approves and merges. Never merge a PR or push to `main`.

## Changes to develop

- **Resume first.** A run may restart after its coordinator died. Look for an open PR from a `factory/<n>-` branch and continue with fresh workers: a PR → CI; no PR → plan.
- The plan file is `/tmp/factory-<repo>-<n>-plan.md` and the branch is `factory/<n>-<slug>`.
- Tell the builder and the refactorer to push the branch after they commit.
- Replace develop's report step with the PR loop below.
- If the run cannot finish, comment the reason on the PR, or on the issue if there is no PR, then remove the `factory` label to end the run.

## PR loop

1. **Open the PR.** After the refactor, send the builder the PR spec and wait for the PR URL. The PR opens only after the refactor, so its first version is the reviewed one.
2. **CI.** Wait with `gh pr checks <pr> --watch`. Send failures to the builder and wait again.
3. **Hand off.** Run `gh pr ready` and `gh pr edit --add-reviewer juanibiapina`. Tell Juan the PR URL.
4. **Stay with the PR.** Run `dev github await-review <owner/repo> <pr> --since=<time of the handoff, or the last checked_at>`. It returns when the PR is merged, closed, or conflicts with `main`, or when someone other than the PR's author or a bot reviews or comments. Juan's messages reach you between waits.
   - `merged` or `closed`: remove the label with `gh issue edit <n> --remove-label factory`, kill the builder, and tell Juan; the next pickup ends your terminal.
   - `conflict`: send the builder a round to update the branch from `main` with `but pull` and push, then go back to CI.
   - A review with inline comments, from Juan or Copilot: read each Copilot comment first. When fixing it would add state, a branch, or a check whose only job is to guard against the design's own timing, concurrency, or stale data, ask Juan instead, naming the design change that would remove the problem. Send the builder the review's URL with the review round spec, then go back to CI.
   - Other comments: answer questions with `gh pr comment`, and treat requests as a review round. Ask Juan when a comment leaves you unsure.
   - A review without inline comments, such as a Copilot review that could not run: tell Juan.
   After handling it, hand off again and wait with `--since` set to the returned `checked_at`.

A comment that returns after the builder addressed it counts as doubt.

End every message to the builder in this loop with develop's builder ending.

## PR spec

<example>
Open a draft PR for branch <branch> with `gh pr create --draft`, whose body includes "Closes #<n>", or update the existing one. Report the PR URL.
</example>

## Review round spec

<example>
Fix the comments in <review URL> on PR <url>. Commit with the commit skill and push. Then reply on each comment's thread with `gh api repos/<owner>/<repo>/pulls/<pr>/comments/<comment-id>/replies -f body=...`: "Fixed in <sha>", or one sentence on why it stays as it is. Leave the threads unresolved. Report when done.
</example>
