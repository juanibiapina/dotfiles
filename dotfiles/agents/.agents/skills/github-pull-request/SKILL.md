---
name: github-pull-request
description: Pull request creation workflow using gh CLI. Use when asked to create a PR, open a pull request, or submit changes for review.
---

# Pull Request

Use `gh` for all GitHub operations.

Understand the full set of changes on this branch since it diverged from the base branch (all commits, not just the latest). Check for a PR template at `.github/pull_request_template.md`.

Draft a PR title and body. If the repo has a template, follow its structure. Otherwise use this format: a summary paragraph explaining why the change was made, a bullet list of changes, and links to related tickets (Jira, Sentry, GitHub issues).

Create a new branch and push if needed. Create the PR with `gh pr create` using a heredoc for the body. Return the PR URL.
