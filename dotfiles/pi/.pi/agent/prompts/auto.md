---
description: Autonomous task pipeline from a checklist file
---

# Auto

Process a checklist file task by task. For each unchecked task, run it through a multi-phase pipeline in isolated sub-sessions, ship a PR, wait for feedback, and loop.

## Setup

1. Determine the task file: use `$ARGUMENTS` if provided, otherwise `PROMPT.md` in the current directory.
2. Read the file. If it doesn't exist, stop and tell the user.
3. Find the first unchecked task (`- [ ]`). If none remain, report all tasks done and stop.
4. Extract the full task text (everything after `- [ ] `).

## Pipeline

For the task you found, run these phases in order. Each phase runs in an isolated `pi -p --no-session` sub-session via the bash tool.

### Phase 1: Goal

Understand what the task is about in context of this project.

```bash
pi -p --no-session "/goal <task text>"
```

### Phase 2: Plan

Produce an implementation plan based on the goal output.

```bash
pi -p --no-session "/plan <goal output>"
```

### Phase 3: Build

Execute the plan. This phase gets write tools.

```bash
pi -p --no-session "/build <plan output>"
```

### Phase 4: Verify

Review the changes against the plan.

```bash
pi -p --no-session "/verify"
```

Read the output. Check whether it found must-fix issues.

### Phase 5: Fix (conditional)

If verify found must-fix issues, run one more plan + build cycle to address them.

**Plan the fixes:**

```bash
pi -p --no-session "/plan <verify output with must-fix items>"
```

**Build the fixes:**

```bash
pi -p --no-session "/build <fix plan output>"
```

If verify found no must-fix issues (only "should fix" or "nice to have", or everything is clean), skip this phase entirely.

## Ship

After the pipeline completes:

1. Derive a short branch name slug from the task description. Use the prefix `auto/` (e.g., `auto/add-og-meta-tags`). Keep it lowercase, use hyphens, max ~50 chars.
2. Create and checkout the branch from main: `git checkout -b <branch-name> main`
3. Stage all changes: `git add -A`
4. Commit with a descriptive message based on the task.
5. Push: `git push -u origin <branch-name>`
6. Create a PR: `gh pr create --title "<task summary>" --body "<context from goal and plan>"`

Save the PR number from the output.

## Wait

Block until the PR has activity:

```bash
gh pr-await <pr-url>
```

This command blocks until the PR receives a comment, review, check status change, or is merged. It prints what happened when it returns.

## React

Based on what `gh pr-await` reported:

### On comment or review with requested changes

1. Read the feedback carefully.
2. Run a build phase to address the feedback:
   ```bash
   pi -p --no-session "/build Address this PR feedback: <feedback text>"
   ```
3. Commit the changes, push to the same branch.
4. Go back to **Wait**.

### On check failure

1. Read the check failure details (use `gh pr checks` or `gh run view`).
2. Run a build phase to fix:
   ```bash
   pi -p --no-session "/build Fix this CI failure: <failure details>"
   ```
3. Commit, push.
4. Go back to **Wait**.
5. If checks fail a second time on the same issue, go back to **Wait** and let the human decide.

### On merge

1. Checkout main and pull: `git checkout main && git pull`
2. Edit the task file locally: change `- [ ]` to `- [x]` for the completed task. Use the edit tool for precision.
3. Go back to **Setup** step 3 to find the next unchecked task.

### On PR closed without merge

Stop and report that the PR was closed. Let the user decide what to do.

## Rules

- Each `pi -p` call is a fresh session. It sees the project files but has no memory of prior phases. You must pass relevant context in the prompt.
- All sub-sessions use default tools.
- When constructing prompts for sub-sessions, include the relevant context from prior phases. Summarize rather than pasting verbatim output.
- The task file is a local working file. Never commit it.
- One task at a time. Finish the full cycle (pipeline, PR, merge) before starting the next.
- If any phase fails (pi exits with an error), report the failure and stop. Do not continue to the next phase.
