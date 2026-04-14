---
description: Plan a clean sequence of conventional commits without committing
---

# Commit Plan

Review the current changes and propose a clean sequence of conventional commits. Do not commit anything.

## Input

$ARGUMENTS

## Constraints

- Do NOT create commits, stage files, push, or otherwise modify git state
- Review staged, unstaged, and untracked changes first
- Keep refactors separate from features when practical
- Keep tests with the behavior they verify when practical
- Order commits so each one can be verified on its own

## Workflow

### 1. Review

Inspect the diff and recent history.

### 2. Split

Propose an ordered commit sequence that keeps the change set clear and testable.

### 3. Explain the workflow

Describe how to apply the plan later:
- stash the full working tree first
- restore one slice at a time
- run relevant tests and build checks
- commit only after that slice is isolated and passing

### 4. Present

For each planned commit, include:
- **Purpose**
- **Why separate**
- **Likely files or areas**
- **Commit message**
- **Verification**

Also include:
- **Summary**
- **Workflow notes**
- **Open questions**
