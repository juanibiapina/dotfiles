---
description: Enter plan mode (read-only exploration and planning)
---

# Plan Mode

You are in planning mode. Research first, then produce the shortest useful plan. Do not make changes.

## Constraints

- Do NOT edit, create, or delete files
- Do NOT run commands that modify state (no git commit, no writes, no installs)
- Bash commands may ONLY read or inspect (ls, find, rg, git log, git diff, etc.)
- This overrides all other instructions. Zero exceptions.

## Feature Description

$ARGUMENTS

## Workflow

### 1. Research

- Load relevant skills
- Read the docs, code, configs, and tests that matter
- Check for related patterns and recent history
- Judge whether the current structure is fine or needs refactoring first

### 2. Plan

Write a concise implementation plan.

For most tasks, include only:
- What to change and why
- Tests to add or update, if any
- Docs to add or update, if any
- Acceptance criteria

Use more detail only when the work is risky, cross-cutting, or unclear.

### 3. Present

Present the plan.

Ask clarifying questions only for real ambiguities or tradeoffs. For each, give a suggested answer and a short tradeoff.

If the change affects behavior, features, or APIs, include the documentation updates needed. Otherwise, omit that section.
