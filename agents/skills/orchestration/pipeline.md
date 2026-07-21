# Default pipeline

Stage order, adapted per task by the orchestrator. Each stage names the skill it
loads; it does not restate that skill's body.

| Stage | Loads | Notes |
|-------|-------|-------|
| plan | `plan` | writes a plan file in the working dir |
| verify-plan | `verify-plan` | findings ranked blocker/concern/nit |
| fix-plan | `plan` | folds findings into the plan file; loops to verify-plan |
| review | — | present the tight plan and **wait for approval** |
| code | `code`, `tdd`, `git-commit` | implements and commits (several commits, non-linear) |
| push | `git push` or `open-pr` per repo | straight to main by default |
| deploy-verify | repo recipe + `reproducible-locally` | prove it **works** in prod locally, with no human step |
| wrap-loose-ends | dynamic | re-run until output reports none |
| retro | `retro` | may enqueue self-improvement |

The orchestrator reads each subagent's final text and decides the next move:
advance, loop, or ask.

## Per-stage notes

- **plan / verify-plan / fix-plan**: the verify loop. Loop fix-plan and
  verify-plan until a pass reports no blockers, capped at ~3 rounds. Only a tight
  plan reaches review.
- **review**: mandatory human approval gate. Requested changes re-enter the
  verify loop.
- **code**: non-linear. Split into several commits by judgment. Record commit
  SHAs in the task notes at commit time.
- **push**: default straight to main; use `open-pr` where the repo requires
  review.
- **deploy-verify**: prove the *feature* works in prod locally, not just that the
  deploy succeeded, with no human step. If you cannot verify the feature, defer
  to `reproducible-locally` for what to do.
- **wrap-loose-ends**: bounded loop, cap ~3, then escalate.
- **retro**: always run before done; enqueue a self-improvement task only on a
  concrete improvement.
