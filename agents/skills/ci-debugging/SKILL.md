---
name: ci-debugging
description: Systematic CI/CD failure diagnosis using hypothesis-first investigation, local reproduction, and environment delta analysis. Use when a CI pipeline, GitHub Actions workflow, or build job fails; when tests pass locally but fail in CI; when diagnosing flaky tests, timeouts, or red pipelines; or when the user says "CI is failing", "the build is broken", or "works on my machine".
---

> Adapted from: https://github.com/citypaul/.dotfiles/tree/6220d843058ff33bb7d3dd3af175fd82b1c7965d/claude/.claude/skills/ci-debugging
> Imported from commit: `6220d843058ff33bb7d3dd3af175fd82b1c7965d`
> License: MIT, Copyright (c) 2024 Paul Hammond

# CI Debugging

Load [`investigate`](../investigate/SKILL.md) as the governing root-cause workflow. Load [`reproducible-locally`](../reproducible-locally/SKILL.md) when defining or running repeatable local proof.

Every CI failure is real until proven otherwise. Never assume flakiness.

## Getting the Data

Pull the actual failure output before forming hypotheses:

```bash
gh run list --branch <branch> --limit 5        # find the failing run
gh run view <run-id> --log-failed              # only the failed steps' logs
gh run view <run-id> --job <job-id> --log      # one job's full log
gh run download <run-id>                       # artifacts (coverage, reports, screenshots)
gh run rerun <run-id> --failed                 # re-run only failed jobs (for evidence, not hope)
```

For step-level detail, re-run with debug logging: set the `ACTIONS_STEP_DEBUG=true` secret/variable, or `gh run rerun <run-id> --debug`. Compare the failing run against the last green run on the same branch (`gh run list`) — the diff in commits, dependency lockfiles, and workflow files between those two runs is the primary suspect list.

If the system under test emits structured telemetry (canonical events, traces, in-memory exporter output from test runs), pull it as evidence alongside the logs — see the `observability` skill.

## Hypothesis-First Diagnosis

After capturing the concrete failure, list plausible root causes supported by the available facts. Use each hypothesis to choose a discriminating probe, then revise or discard it as evidence arrives.

**Example hypotheses for a test timeout:**
1. Test relies on network access unavailable in CI
2. Parallel test execution causes resource contention
3. CI runner has less memory/CPU than local machine

## Local Reproduction

Use `reproducible-locally` to turn the failure into repeatable automated evidence before pushing fixes.

- Run the **exact** failing command, not a close equivalent
- Match the CI environment as closely as possible (Node version, env vars)
- If it passes locally, investigate the delta between environments

## Environment Delta Analysis

Compare CI vs local:

| Factor | Check |
|--------|-------|
| Node/runtime version | CI config vs `node -v` locally |
| OS | Linux CI vs macOS local |
| Dependency resolution | Fresh `npm ci` vs cached `node_modules` |
| Env vars | CI secrets/config vs local `.env` |
| Parallelism | CI may run tests in parallel differently |
| Memory/CPU | CI runners often have less resources |
| Network | CI may block external network access |
| File system | Case sensitivity (Linux) vs insensitive (macOS) |

## Read the Full Error

- Read the **complete** error output, not just the last line
- Check preceding log lines and warnings — they often contain the real cause
- Look at stack traces to identify the actual failure point
- Check for earlier failures that may cascade into the visible error

## Fix Verification

After identifying a fix:

1. Explain **why** it addresses the root cause (not just the symptom)
2. Run the exact failing command locally
3. Verify the fix doesn't mask the real issue (e.g., adding a retry hides a race condition)

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Instead |
|-------------|----------------|---------|
| "It's flaky, re-run it" | Masks real issues | Investigate the failure |
| Adding retries/sleeps | Hides timing bugs | Fix the race condition |
| Pushing speculative fixes | Wastes CI cycles | Reproduce and verify locally |
| Reading only the last error line | Misses root cause | Read full output from the top |
| Fixing symptoms | Problem will recur | Trace to root cause |

## Proving Flakiness

A failure is only flaky if you have evidence:
- Multiple independent runs with **identical** environment showing different results
- AND you can identify the non-deterministic source (race condition, time-dependent test, external service)

Without this evidence, treat every failure as a real bug.

## Handoff

Report the cause and evidence before changing code. If the user authorizes a fix, write a failing test that reproduces it first and load `tdd` (or `characterisation-tests` when the broken code has no tests). Use `reproducible-locally` for the final proof.
