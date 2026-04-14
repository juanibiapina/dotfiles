---
description: Review a GitHub pull request locally
---

# PR Review

Review the GitHub pull request identified by `$ARGUMENTS`. If none is provided, ask for it.

Produce a local review of intent, risk, and code quality.

## Constraints

- Stop if the working tree is dirty and ask whether to clean or stash it first
- Do not post GitHub comments or submit a review unless explicitly asked
- Use the PR base branch from GitHub when available, otherwise `origin/main`

## Workflow

- Fetch the latest refs
- Check out the PR locally
- Determine the base branch
- Inspect the commit range and diff against the remote base
- Read the changed files before writing the review

## Gotchas

- Fetch before comparing
- Compare against the remote base branch
- Use a diff range that shows only PR changes

## Output

Return:
1. **Summary**
2. **Findings** ordered by severity
3. **Merge recommendation**
4. **Verification gaps**

Include file paths and line numbers when available.
