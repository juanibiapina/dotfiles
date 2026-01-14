---
name: jira-work-starter
description: This skill should be used when the user wants to start working on a Jira ticket. Trigger when user says "Let's work on [JIRA_URL]" or similar phrases indicating intent to begin work on a specific Jira issue. The skill orchestrates environment preparation, information gathering, and branch creation for development work.
---

# Jira Work Starter

## Overview

Intelligently prepare the development environment for working on a Jira ticket by orchestrating automated scripts with LLM-powered information parsing and decision-making. The skill combines script automation (for repeatable operations) with LLM intelligence (for parsing, analysis, and compilation).

## When to Use

Use this skill when the user expresses intent to start working on a Jira ticket, such as:
- "Let's work on https://contentful.atlassian.net/browse/NT-1764"
- "Start work on NT-1764" (with URL context)
- "I want to work on this ticket" (with Jira URL in context)

Do NOT trigger this skill if:
- The Jira URL appears in a conversation for other purposes (reading, discussing, linking)
- The user is only asking about a ticket, not starting work on it

## Workflow

### Step 1: Run Pre-Work Script

Execute the data-gathering script:

```bash
scripts/pre-work.sh <jira-url>
```

This script performs all automated operations:
1. Extracts ticket ID from the Jira URL
2. Validates git worktree is clean (errors if dirty)
3. Runs `dev clear` to reset the environment
4. Fetches ticket information using `jira issue view <ticket-id>`
5. Fetches parent hierarchy using `dev jira parents <ticket-id>`
6. Fetches subtasks using `dev jira subtasks <ticket-id>`

The script outputs all information to stdout in a structured format with clear section markers.

**Important:** If the script fails (non-zero exit code), inform the user of the error and do not proceed.

### Step 2: Parse and Analyze Output

Read and intelligently parse the pre-work script output:

1. **Extract ticket information** from the "TICKET INFORMATION" section:
   - Ticket ID
   - Summary/title
   - Description
   - Status
   - Assignee
   - Priority
   - Labels
   - Issue type
   - Any other relevant fields

2. **Extract parent hierarchy** from the "PARENT HIERARCHY" section:
   - Parse the markdown-formatted parent list
   - Preserve the hierarchy structure and Jira links

3. **Extract subtasks** from the "SUBTASKS" section:
   - Parse the subtask list (if any)
   - Include keys, summaries, and statuses

### Step 3: Generate Branch Name

Analyze the ticket summary and create an appropriate kebab-case branch name:

**Format:** `<ticket-id>/<short-descriptive-name>`

**Guidelines for short name:**
- Use 2-4 words from the ticket summary
- Convert to lowercase kebab-case
- Focus on the main action/feature (e.g., "fix-login-bug", "add-user-export")
- Keep it under 40 characters total
- Remove generic words like "feature", "ticket", "issue"

**Examples:**
- NT-1764: "Fix user authentication timeout bug" → `NT-1764/fix-auth-timeout`
- ABC-123: "Add CSV export functionality for reports" → `ABC-123/add-csv-export`
- DEF-456: "Update styling on dashboard homepage" → `DEF-456/update-dashboard-styling`

### Step 4: Run Post-Work Script

Execute the state-change script:

```bash
scripts/post-work.sh <ticket-id> <branch-name>
```

Where:
- `<ticket-id>` is the extracted ticket ID (e.g., "NT-1764")
- `<branch-name>` is the generated branch name from Step 3 (e.g., "NT-1764/fix-auth-timeout")

This script performs:
1. Transitions the Jira ticket to "In Progress"
2. Creates and checks out the feature branch
3. Displays a success summary

### Step 5: Confirm Completion

Inform the user that the environment is ready:
- Show the ticket ID and branch name
- Provide any relevant context from the ticket that might be helpful

**Example summary:**
```
✓ Ready to work on NT-1764!

Branch: NT-1764/fix-auth-timeout
Status: In Progress

The ticket involves fixing a user authentication timeout bug. Parents include the larger authentication refactoring epic (AUTH-100). You have 3 subtasks to complete.
```

## Error Handling

- If pre-work script fails, stop and inform the user of the specific error
- If git worktree is dirty, the pre-work script will exit with an error message
- If Jira CLI commands fail, continue with available information but note missing data
- If unable to parse output, ask the user for clarification or manual input

## Scripts

This skill uses two scripts in the `scripts/` directory:

### pre-work.sh
Gathers all information needed to start work. Takes Jira URL as single argument.

### post-work.sh
Executes state changes (Jira transition, branch creation). Takes ticket ID and branch name as arguments.

Both scripts use `set -e` for automatic error handling and output structured information for LLM parsing.
