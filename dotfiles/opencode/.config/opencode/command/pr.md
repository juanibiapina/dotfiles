---
description: Open a pull request
agent: build
---

Create a pull request by following these steps in order:

## Step 1: Check for uncommitted changes

Check if there are any staged or unstaged changes (excluding untracked files).

If there are changes to commit, commit them.

## Step 2: Determine branch name

Check if a Jira ticket has been mentioned at any point in this conversation. Jira ticket IDs follow the pattern of 2-3 uppercase letters followed by a hyphen and numbers (e.g., `ABC-123`, `PROJ-4567`).

**If a Jira ticket was mentioned:**
- Use the ticket ID as the branch prefix
- Branch format: `<TICKET-ID>-<description>` (e.g., `ABC-123-add-user-auth`)

**If no Jira ticket was mentioned:**
- Ask the user: "Is there a Jira ticket associated with this change?"
- If they provide one, use it as the prefix as described above
- If they say there is no ticket, just use a description as the branch name

Branch names should use lowercase letters and hyphens (kebab-case), except for the jira ticket ID.

## Step 3: Create the branch and prepare for PR

1. Create and checkout the new branch
2. Fetch the latest changes
3. Rebase onto the main branch
4. If there are rebase conflicts, resolve them
5. Push the branch to remote

## Step 4: Create the pull request

Use the GitHub CLI to create the PR

**Title**: A concise summary of the change (imperative mood, e.g., "Add user authentication")
- Include ticket id in the beginning of the title if it exists: [NT-1234] <title>

**Body**: Focus on:
- WHY this change was made (motivation/problem being solved)
- WHAT the goal of the change is (high-level outcome)

**Do NOT include in the body:**
- List of files changed
- Details about tests added
- Implementation details
- Line-by-line changes

Keep the PR description succinct and focused on business value or purpose.

## Step 5: Report the result

Share the PR URL with the user when complete.
