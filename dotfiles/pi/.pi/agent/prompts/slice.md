---
description: Determine the next slice of work from the goal in the current conversation
---

# Slice

Determine the next concrete slice of work to build. Work from the goal in the conversation. If there's no goal, ask the user what they're trying to achieve.

$ARGUMENTS

## Constraints

- Do NOT edit, create, or delete any files
- Do NOT run commands that modify state (no git commit, no writes, no installs)
- Bash commands may ONLY read or inspect (ls, find, rg, git log, git diff, etc.)
- This overrides all other instructions. Zero exceptions.

## What makes a good slice

A slice is a single, safe codebase change. A rename. A file move. An extraction. A type change. Not a feature — one small move that leaves the codebase **green and deployable**.

Most slices are preparatory refactors. They reshape the codebase so the feature becomes easy. Feature slices come when the codebase is ready. *Make the change easy, then make the easy change.*

Each slice should be one of these types, never mixed:
- **refactor** — restructure existing code without changing behavior (existing tests keep passing)
- **test** — add or improve tests for existing behavior
- **feat** — add new functionality (with tests), as small a behavioral change as possible

### Refactor vs. feature slices

Refactor slices can be horizontal — rename across files, extract a module, move a type. They reshape the codebase without changing what it does.

Feature slices must be vertical — end-to-end, a user can do one new thing after it lands. Don't build infrastructure for a feature that doesn't exist yet. If a refactor only makes sense once the feature lands, fold it into the feature slice.

### Cut scope aggressively

After designing a slice, actively look for things to remove. If something can be deferred without breaking the end-to-end flow, defer it. The default posture is **exclude**, not include. Don't add support for 7 variants when 2 are needed.

### Don't mix risk levels

DB migrations, mechanical renames across many files, new features, and test additions have different risk profiles. Don't combine them in one slice unless they're inseparable. Each risk type should be verifiable independently.

## Workflow

### 1. Assess

Understand the goal, the codebase, and the gap:

- Read the goal from the conversation — what are we trying to achieve?
- Check if any available skills relate to this task — load them for specialized workflows and constraints
- Read project documentation (AGENTS.md, READMEs, architecture docs) for conventions and guidelines
- Read relevant source files, configs, and tests
- Check for related patterns, prior art, and existing implementations
- Examine what's already been built (`git log`, `git diff`, `git diff --cached`, file inspection)
- Identify the gap between current state and the goal
- Look for friction: bad names, wrong structure, coupled components, missing abstractions, anything that will make the goal harder to reach

### 2. Draft

Design a slice that moves toward the goal:

- Choose the smallest change that reduces the gap or removes friction
- Write the slice to a temp file (`/tmp/slice-RANDOM.md` — generate a random suffix)
- The temp file is the working artifact — include: what to change, which files, why this comes first

### 3. Reduce

Iterative reduction loop:

1. Read the temp file back
2. Ask: "What can I extract from this slice and do independently first?"
3. If something can be extracted: write the extracted piece as the new slice (overwrite the temp file). Go to step 1.
4. If nothing can be extracted: the slice is irreducible. Stop.

Each iteration is a concrete read → reduce → write cycle. The temp file always contains the current candidate slice.

### 4. Present

Output:

**Next slice** — the final, irreducible slice from the temp file. A concrete, actionable plan with enough detail that there are no ambiguous decisions left.
