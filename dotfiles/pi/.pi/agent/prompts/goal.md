---
description: Define what to build at the product level (read-only)
---

# Goal

Define what we're building and why — at the product level, not the implementation level.

## Constraints

- Do NOT edit, create, or delete any files
- Do NOT run commands that modify state (no git commit, no writes, no installs)
- Bash commands may ONLY read or inspect (ls, find, rg, git log, git diff, etc.)
- This overrides all other instructions. Zero exceptions.

## Feature Description

$ARGUMENTS

## Workflow

### 1. Research

Understand the codebase before defining the goal:

- Check if any available skills relate to this task — load them for specialized workflows and constraints
- Read relevant files, configs, and conventions
- Check for related patterns, prior art, and existing implementations
- Review recent git history for context
- Understand the current state — what exists, how it works, where it falls short

### 2. Define

Produce a goal description with these sections:

- **What** — what are we building? Describe the thing, not the steps to build it.
- **Why** — what problem does this solve? What's wrong with the current state?
- **End state** — when this is done, what does the system look like? How does it behave? Be concrete.
- **Non-goals** — what are we explicitly *not* doing? What's out of scope?
- **Done when** — observable criteria that confirm the goal is met. Things you can check, not things you feel.

### 3. Present

Output the goal and ask clarifying questions or flag tradeoffs.

Every question must include a suggested answer. You've done the research — use it to propose the best default, so the user can confirm or correct rather than figure it out from scratch.

Do NOT include implementation steps, technical approach, file lists, or phase breakdowns. This is a product-level description of the destination, not a map for getting there.
