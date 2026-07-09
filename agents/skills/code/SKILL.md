---
name: code
description: Use when executing a plan or implementing a coding task. Turns a plan or clear request into working code, tests, and verification.
---

# Code

Execute the plan from the conversation. If no plan is clear, ask what to build.

## Workflow

### 1. Understand

- Load relevant skills
- Review the plan from the conversation
- Ask if anything important is unclear
- Do not skip this. Better to ask now than build the wrong thing.

### 2. Execute

Implement systematically:

- Follow existing patterns in the codebase. Read similar code first, match conventions.
- Make changes incrementally, one logical unit at a time
- Test as you go. Run relevant tests after each significant change, fix failures immediately.
- Don't overengineer. Do what the plan says, nothing more.
- Don't commit when coding is done.

### 3. Verify

After completing the work:

- Run the full test suite or relevant checks
- Review your changes for completeness against the plan
- Report what was done and flag anything that needs follow-up
