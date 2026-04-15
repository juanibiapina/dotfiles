---
description: Implement using canonical TDD (Kent Beck style)
---

# Implementation Mode: TDD

Implement using canonical TDD.

$ARGUMENTS

## Workflow

### 1. Understand

- Load relevant skills
- Review the task and current tests
- Ask if anything important is unclear

### 2. Test List

Before writing code, make a living test list of the behavior to implement.

### 3. Cycle

For each step:
1. Re-evaluate the test list
2. Pick the next smallest goal
3. **Red**: write one failing test and confirm it fails for the right reason
4. **Green**: write the minimum code to pass it
5. **Refactor**: clean up while keeping tests green

Do not skip ahead. Do not write production code without a failing test driving it.

### 4. Verify

- Run the relevant test suite
- Review the result against the task
- Report what changed and any follow-up
