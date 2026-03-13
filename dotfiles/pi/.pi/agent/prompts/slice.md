---
description: Determine the next slice of work from the plan in the current conversation
---

# Slice

Determine the next concrete slice of work to build. The plan should already be in the conversation — if not, ask the user to run `/plan` first.

$ARGUMENTS

## Constraints

- Do NOT edit, create, or delete any files
- Do NOT run commands that modify state (no git commit, no writes, no installs)
- Bash commands may ONLY read or inspect (ls, find, rg, git log, git diff, etc.)
- This overrides all other instructions. Zero exceptions.

## What makes a good slice

A slice is the smallest unit of work that leaves the codebase **green and deployable**. Every slice is a safe resting point — you could ship it, revert to it, or hand the keyboard to someone else.

Each slice should be one of these types, never mixed:
- **refactor** — restructure existing code without changing behavior (existing tests keep passing)
- **test** — add or improve tests for existing behavior
- **feat** — add new functionality (with tests), as small a behavioral change as possible

Prefer preparatory refactoring before feature work: *make the change easy, then make the easy change.* If the feature slice looks big, there's probably a refactor slice hiding in front of it.

## Workflow

### 1. Assess

Understand what's done and what remains:

- Review the plan from the conversation — what's the full scope?
- Check what's already been built (`git log`, `git diff`, `git diff --cached`, file inspection)
- Cross-reference conversation history — what was built, what was discussed, what failed?
- Identify what's left to do

### 2. Decompose

Design the next slice in detail:

- Choose the smallest unit of work that moves the plan forward and leaves the codebase in a valid state
- Specify what kind of change it is (refactor, test, feature, documentation, etc.)
- List the specific files to create, modify, or delete
- Explain why this slice comes before the others — what does it unblock or establish?
- If tests are involved, describe what to test and how

Then sketch the remaining slices loosely — just direction and rough scope. These are not commitments; they will be re-evaluated after the next `/build`.

### 3. Present

Output:

**Next slice** — a concrete, actionable plan that `/build` can execute directly. Enough detail that there are no ambiguous decisions left.

**Remaining slices** — a brief, high-level list of what's likely left. Explicitly note that these are subject to re-evaluation after the next slice is built.
