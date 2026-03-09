---
name: github-pull-request
description: Pull request creation workflow using gh CLI. Use when asked to create a PR, open a pull request, or submit changes for review.
---

# Creating pull requests
Use the gh command via the Bash tool for ALL GitHub-related tasks including working with issues, pull requests, checks, and releases. If given a Github URL use the gh command to get the information needed.

IMPORTANT: When the user asks you to create a pull request, follow these steps carefully:

1. Run the following bash commands in parallel in order to understand the current state of the branch since it diverged from the main branch:
   - Run a git status command to see all untracked files
   - Run a git diff command to see both staged and unstaged changes that will be committed
   - Check if the current branch tracks a remote branch and is up to date with the remote, so you know if you need to push to the remote
   - Run a git log command and `git diff [base-branch]...HEAD` to understand the full commit history for the current branch (from the time it diverged from the base branch)
   - Check if the repo has a PR template at `.github/pull_request_template.md` so we use it as a template

2. Analyze all changes that will be included in the pull request, making sure to look at all relevant commits (NOT just the latest commit, but ALL commits that will be included in the pull request), and draft a pull request summary explaning why the change was made. Use conversation history if available. If the repo has a PR template, follow its structure. Otherwise, use this default format:
   - A summary paragraph explaining why the change was made
   - A bullet list of the changes
   - Links to related Jira tickets, Sentry issues, GitHub issues, etc.

3. Run the following commands in order:
   - Create new branch if needed
   - Push to remote with -u flag if needed
   - Create PR using gh pr create. Use a HEREDOC to pass the body to ensure correct formatting.

Example using default format (when no repo template exists):
```
gh pr create --title "the pr title" --body "$(cat <<'EOF'
<summary paragraph explaining why the change was made>

- <change 1>
- <change 2>
- ...

Jira: [PROJ-123](https://example.atlassian.net/browse/PROJ-123) · Sentry: [123456](https://example.sentry.io/issues/123456)
EOF
)"
```

Important:
- Return the PR URL when you're done, so the user can see it
