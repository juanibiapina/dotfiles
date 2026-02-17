---
description: Interactively design a PROMPT.md for the ralph development loop
---

Help me create a PROMPT.md file for an autonomous development loop. This file will guide an AI agent through implementing a project step by step, where each step results in a separate branch, commit, and pull request.

Interview me to understand the project. Ask questions one at a time, starting with the goal. Cover:

1. **Goal** — What is the project about? What problem does it solve?
2. **Context** — What already exists? What technologies, frameworks, or patterns are in use?
3. **Requirements** — Key requirements, constraints, or non-functional considerations?
4. **Steps** — Break the work into small, independently deliverable steps. Each step should be:
   - Small enough for a single PR
   - Ordered by dependency
   - Independently valuable
   - Including tests where appropriate

After gathering all information, write a PROMPT.md file in the current directory using this exact format:

```
# <Project Name>

## Goal

<Clear, concise description of the project goal>

## Context

<Current state: existing code, technologies, relevant architecture>

## Requirements

<Key requirements, constraints, acceptance criteria>

## Steps

- [ ] <Step 1: specific, actionable description>
- [ ] <Step 2: specific, actionable description>
- [ ] <Step 3: specific, actionable description>
...

## Learnings

## History
```

Guidelines for writing steps:
- Use imperative mood ("Add X", "Implement Y", "Configure Z")
- Be specific about what each step delivers
- Include test expectations in the step description when relevant
- Order from foundational to feature-level (infrastructure → core logic → integrations → polish)

Start by asking about the project goal.
