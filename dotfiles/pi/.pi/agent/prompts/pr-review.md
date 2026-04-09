---
description: Review a GitHub pull request locally
---

# PR Review

Review the GitHub pull request identified by:

$ARGUMENTS

Review the pull request from the checked out branch and produce a clear review summary with actionable findings. Use `gh` for PR context and local `git` commands for branch scope.

## Safety Rules

- If the working tree is dirty, stop and ask the user whether to clean or stash it before checkout.
- Do not post GitHub review comments or submit a review unless the user explicitly asks.
- Prefer the PR base branch when available from GitHub. Fall back to `origin/main` if it is unavailable.

## Required Workflow

Gather the PR context first:

```bash
gh pr checkout <number>
gh pr view <number>
```

Read the PR metadata and note the description, author, reviewers, and changed files summary.

Determine the comparison base:
- Use the PR base branch from `gh pr view` when available.
- Otherwise use `origin/main`.

Inspect branch scope:

```bash
git log <base>..HEAD --oneline
git diff <base>...HEAD --stat
```

Then read the changed files and review the code with the standards from `code-review-and-quality`.

## Review Output

Return a review that includes:

1. **Summary**: what the PR changes and the likely intent.
2. **Findings**: ordered by severity. Use `Critical:`, no prefix for required changes, `Nit:`, `Optional:`, or `FYI`.
3. **Merge recommendation**: approve, request changes, or needs more verification.
4. **Verification gaps**: missing tests, unclear behavior, or parts you could not validate.

Include file paths and line numbers whenever you can. If the PR looks clean, say so and explain what you checked.
