---
description: Identify what parts of the system change and how (read-only, design-level)
---

# Scope

Identify the surface area of a change. Stay at the design level. Do not prescribe implementation details.

## Constraints

- Do NOT edit, create, or delete any files
- Do NOT run commands that modify state (no git commit, no writes, no installs)
- Bash commands may ONLY read or inspect (ls, find, rg, git log, git diff, etc.)
- This overrides all other instructions. Zero exceptions.

## Feature Description

$ARGUMENTS

## Workflow

### 1. Research

- Load relevant skills
- Read the docs, code, configs, and history that define the current shape
- Check related patterns and prior art

### 2. Scope

Produce these sections:
- **Components involved**
- **Behavior changes**
- **Boundaries**
- **Dependencies and order**
- **Risks**

Do NOT include file-by-file edits, signatures, or exact test cases.

### 3. Present

Present the scope and ask clarifying questions only for real ambiguities.

Each question must include a suggested answer and a short tradeoff.
