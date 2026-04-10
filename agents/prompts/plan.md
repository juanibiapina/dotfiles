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

Explore the codebase enough to understand the change:

- Check for relevant skills and follow them
- Read the docs, code, configs, and tests that matter
- Check for related patterns and recent history
- Judge whether the current structure is fine or needs refactoring first

### 2. Plan

Write a concise implementation plan.

Default to a minimal plan. Expand only if the work is risky, cross-cutting, or unclear.

For most tasks, include only:

- What to change and why
- Tests to add or update, if any
- Docs to add or update, if any
- Acceptance criteria

Use vertical slices only when they help. Do not invent phases or slices for a small change.

Keep the plan tight:

- Prefer bullets over prose
- Combine related items
- Do not repeat the feature description
- Do not add boilerplate sections that do not help

### 3. Present

Present the plan.

Ask clarifying questions only if there is a real ambiguity or tradeoff. For each question, give a suggested answer and a short tradeoff.

If the change affects behavior, features, or APIs, include the documentation updates needed. Otherwise, omit that section.
