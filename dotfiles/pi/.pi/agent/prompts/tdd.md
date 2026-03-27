---
description: Implement using canonical TDD (Kent Beck style)
---

# Implementation Mode: TDD

Implement using canonical TDD. If no task is apparent from the conversation, ask the user what to build.

$ARGUMENTS

## Workflow

### 1. Understand

- Check if any available skills relate to this task — load them for specialized workflows and constraints
- Review the plan or task from the conversation
- If anything is unclear or ambiguous, ask clarifying questions before starting
- Read the relevant code and tests to understand the starting point

### 2. Test List

Before writing any code, produce a **test list** that describes the behavior to implement. Break big tasks into atomic testable pieces. The list is living — add new tests as you discover edge cases, and cross off tests as you complete them. If existing tests need to change, add those to the list.

### 3. Cycle

Each iteration of the cycle has five parts:

1. **Re-evaluate the list** — Based on what you've learned so far, revisit the test list. Add tests you've discovered, remove ones that no longer make sense, reorder based on new understanding. The list evolves with your knowledge of the problem.

2. **Pick the next goal** — Determine what behavior to tackle next. What is the simplest next thing the system should do? Choose a test from the list that drives toward that goal.

3. **Red** — Write one failing test for that goal. Run it and confirm it fails **for the right reason** (e.g., method doesn't exist, wrong return value — not a syntax error or unrelated failure). One failing test at a time.

4. **Green** — Write the minimal code to make the test pass, nothing more. When stuck, start with hard-coded values (Fake It), then use triangulation (add another test case) to force generalization.

5. **Refactor** — Review the code for readability, clarity, and duplication. Tests must stay green during refactoring. Only refactor when all tests pass.

After refactoring, evaluate: did you complete that goal? If not, stay on it. If yes, go back to step 1.

**No skipping ahead**: Don't write production code except to pass a failing test. Don't write multiple tests at once.

### 4. Verify

After completing the test list:

- Run the full test suite or relevant checks
- Review your changes for completeness against the task
- Report what was done and flag anything that needs follow-up
