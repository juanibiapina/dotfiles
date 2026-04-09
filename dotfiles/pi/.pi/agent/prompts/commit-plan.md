---
description: Plan a clean sequence of conventional commits without committing
---

# Commit Plan

Review the current changes and propose a commit plan that splits them into distinct, testable conventional commits. Do not commit anything yet.

## Input

$ARGUMENTS

## Constraints

- Do NOT create commits, stage files, push, or otherwise modify git state
- Review staged, unstaged, and untracked changes before planning
- Keep refactors separate from features
- Keep style-only changes separate when practical
- Keep a feature's tests with that feature
- If tests cover behavior that already existed, plan them as their own commit
- Order commits so each one can be committed and verified independently
- Every planned commit must leave the repo with relevant tests passing and the build passing
- If unrelated or overlapping changes block a clean split, explain how temporary stashing would isolate each commit cleanly

## Workflow

### 1. Review the change set

Inspect the current diff and recent commit history for context.

### 2. Split into commits

Propose an ordered sequence of commits that keeps behavior changes, refactors, style changes, and pre-existing test coverage cleanly separated while still grouping related feature work together.

### 3. Explain the commit workflow

Describe the workflow we will follow later when applying the plan:

- Stash the full working tree first
- For each planned commit, pull out only the changes for that slice from the stash while leaving the rest stashed for later commits
- Run the relevant tests and the build, and do not commit until they pass
- Create the commit only after that slice is isolated and verified
- Repeat for the next planned commit until the stash is fully consumed

If the split looks awkward, explain where this workflow may need extra care.

### 4. Present the plan

For each planned commit, include:

- **Purpose**: what belongs in the commit
- **Why separate**: why this boundary improves clarity, testing, or review
- **Likely files or areas**: the main files, directories, or concerns involved
- **Commit message**: a proposed Conventional Commit message
- **Verification**: what to run to confirm tests pass and the build passes after this commit

Also include:

- **Summary**: a short overview of the full change set
- **Workflow notes**: any spots where restoring one slice at a time from the stash may be tricky
- **Open questions**: awkward overlaps, risky splits, or places where a perfectly clean split may not be possible
