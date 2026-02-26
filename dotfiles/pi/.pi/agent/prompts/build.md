---
description: Execute the plan from the current conversation
---

# Build

Execute the plan from this conversation. If no plan is apparent, ask the user what to build.

## Workflow

### 1. Understand

- Review the plan from the conversation
- If anything is unclear or ambiguous, ask clarifying questions before starting
- Do not skip this — better to ask now than build the wrong thing

### 2. Execute

Implement systematically:

- Follow existing patterns in the codebase — read similar code first, match conventions
- Make changes incrementally — one logical unit at a time
- Test as you go — run relevant tests after each significant change, fix failures immediately
- Don't overengineer — do what the plan says, nothing more

### 3. Verify

After completing the work:

- Run the full test suite or relevant checks
- Review your changes for completeness against the plan
- Report what was done and flag anything that needs follow-up
