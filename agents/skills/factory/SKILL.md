---
name: factory
description: Runs a GitHub issue through the software factory on mini, where pi workers in herdr-core terminals plan, verify, build, and refactor the change and hand Juan a bot-authored PR to review. Use when asked to process, build, or run an issue through the factory, or when coordinating work in ~/factory/<repo>.
---

# Factory

A factory run is a run of the `develop` skill for one GitHub issue, `<n>`, that nobody started by hand. Load the `develop` skill and follow it as the coordinator, with the changes below.

## Environment

- Runs start automatically: `dev factory pickup` runs every 5 minutes on mini and starts a coordinator for each open issue labeled `factory`, one at a time, as a herdr-core (`hc`) terminal shown in Herdr. A dead coordinator is started again on the next check. Once the issue is closed or loses the `factory` label, the next check kills the coordinator and with it every worker.
- The coordinator and all workers run in the factory clone `~/factory/<repo>`. There, commits, pushes and `gh` act as `zerocoding-app[bot]`, through the clone's `.envrc`. Outside it, everything acts as Juan.
- Act only through the clone's git and `gh`. Ask Juan before using any other service or credential, such as Cloudflare or Juan's own GitHub account.
- Open and update PRs with `gh pr create` and `gh pr edit`. Other PR tools use Juan's account, and Juan cannot approve his own PR.
- Juan is away. Herdr Mobile notifies his phone when you ask, and he answers in your terminal.

## Changes to the loop

- **Resume first.** A run may restart after its coordinator died. Look for an open PR from a `factory/<n>-` branch and continue with fresh workers: a PR → CI (step 4); no PR → plan (step 1).
- The plan file is `/tmp/factory-<repo>-<n>-plan.md` and the branch is `factory/<n>-<slug>`.
- At hand-off, also run `gh pr edit --add-reviewer juanibiapina`.
- Wait for review without `--timeout`.
- When the PR is merged or closed, remove the label with `gh issue edit <n> --remove-label factory`; the next pickup ends your terminal.
- If the run cannot finish, comment the reason on the PR, or on the issue if there is no PR, then remove the `factory` label to end the run.
