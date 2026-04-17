---
description: Review a GitHub pull request locally
---

# PR Review

Review the GitHub pull request identified by `$ARGUMENTS`. If no PR number is provided, ask for it.

Produce a local review of the PR's intent, risk, and code quality. Use GitHub CLI for PR context and local git history and diff to inspect the branch.

## Constraints

- Stop if the working tree is dirty and ask whether to clean or stash it before checking out the PR.
- Do not post GitHub comments or submit a review unless the user explicitly asks.
- Use the PR base branch from GitHub when available. Fall back to `origin/main` if it is not.

## What to inspect

Collect enough context to understand:

- the PR description and stated intent
- author, reviewers, and changed files
- commits and branch scope relative to the base branch
- correctness, regressions, edge cases, tests, and maintainability in the changed code

Check out the PR locally, fetch the latest remote refs, determine its base branch, inspect the commit range and diff, and read the changed files before writing the review.

## Gotchas

- Fetch before comparing so `origin/main` or the PR base branch reflects the latest remote state.
- Compare against the remote base branch, not a stale local branch.
- Use a diff range that shows only commits and changes introduced by the PR head branch, excluding new commits that landed on `main` after the branch diverged.
- Be careful with `git diff A..B` versus `git diff A...B`. Using the wrong range can include unrelated base-branch changes or hide the actual PR scope.

## Output

Return a review with:

1. **Summary**: what changed and why.
2. **Findings**: ordered by severity. Use `Critical:`, no prefix for required changes, `Nit:`, `Optional:`, or `FYI`.
3. **Merge recommendation**: approve, request changes, or needs more verification.
4. **Verification gaps**: anything you could not validate, including missing tests or unclear behavior.

Include file paths and line numbers when available. If the PR looks clean, say so and state what you checked.
