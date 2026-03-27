---
description: Execute the plan from the current conversation
---

# Build

Execute the plan from this conversation. If no plan is apparent, ask the user what to build.

$ARGUMENTS

## Workflow

### 1. Understand

- Check if any available skills relate to this task. Load them for specialized workflows and constraints.
- Review the plan from the conversation
- If anything is unclear or ambiguous, ask clarifying questions before starting
- Do not skip this. Better to ask now than build the wrong thing.

### 2. Execute

Implement systematically:

- Follow existing patterns in the codebase. Read similar code first, match conventions.
- Make changes incrementally, one logical unit at a time
- Test as you go. Run relevant tests after each significant change, fix failures immediately.
- Don't overengineer. Do what the plan says, nothing more.

### 3. Verify

After completing the work:

- Run the full test suite or relevant checks
- Review your changes for completeness against the plan
- Report what was done and flag anything that needs follow-up
