---
description: Investigate and fix a bug with test-driven diagnosis
---

# Bug Fix

Fix a bug using test-driven diagnosis. Write a failing test first, then fix it.

## Bug Description

$ARGUMENTS

## Workflow

### 1. Investigate

Find the root cause before touching any code:

- Read relevant source files — trace the execution path that triggers the bug
- Check existing tests to understand intended behavior
- Check recent git history for changes that may have introduced it
- Narrow down to the specific code responsible
- If the bug description is unclear, ask questions before proceeding
- State the root cause clearly before moving on

### 2. Reproduce

Write a test that exposes the bug:

- The test should encode the correct expected behavior
- It must fail against the current code, proving the bug exists
- Keep it minimal — test exactly the broken behavior, nothing else
- Run the test and confirm it fails

If the test passes, your understanding of the bug is wrong — go back to step 1.

### 3. Fix

Make the minimal change to fix the bug:

- Fix only what's broken — don't refactor, don't clean up
- Follow existing patterns in the codebase
- Run the failing test and confirm it now passes
- Run the full test suite to check for regressions

### 4. Report

Summarize:

- Root cause
- What the test covers
- What was changed to fix it
- Any related issues worth noting
