---
description: Expand a high-level plan into a concrete implementation blueprint with modules, APIs, and execution order
---

# Blueprint

Produce a concrete implementation blueprint. Do not make changes.

## Feature or Plan

$ARGUMENTS

## Workflow

### 1. Research

- Load relevant skills
- Review the plan and constraints from the conversation
- If no concrete plan is available, ask for one before proceeding
- Read the docs, code, configs, and tests that define the current shape
- Check for existing patterns worth matching

### 2. Blueprint

Produce a concrete implementation plan with these sections when they apply:
- **Goal**
- **Files to touch**
- **Module shapes**
- **API names and signatures**
- **State and data flow**
- **Edge cases and constraints**
- **Tests**
- **Implementation order**

Be concrete. Name likely files, functions, types, and boundaries.

Stay at the design level:
- include likely module and API shapes
- include helper names when useful
- do NOT write the code
- do NOT prescribe exact line-by-line edits unless the task is unusually fragile

### 3. Present

Present the blueprint in a form ready to implement.

Ask clarifying questions only for real ambiguities or tradeoffs. For each, give a suggested answer and a short tradeoff.
