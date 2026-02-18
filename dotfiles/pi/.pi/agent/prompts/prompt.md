---
description: Generate a PROMPT.md from the current conversation
---

Review the entire conversation so far. A design discussion has already taken place — goals have been defined, decisions made, context established, and requirements agreed upon. Your job now is to distill all of that into a well-structured PROMPT.md file.

Go through the conversation and extract:

1. **Goal** — What is the project about? What problem does it solve?
2. **Context** — What already exists? Technologies, frameworks, patterns, architecture decisions made during the conversation.
3. **Requirements** — Key requirements, constraints, non-functional considerations, and any explicit decisions or trade-offs that were resolved.
4. **Steps** — Break the work into small, independently deliverable steps.

Guidelines for writing steps:

- Each step should be a **vertical slice** — deliver a thin, working piece end-to-end rather than building in horizontal layers (e.g., "Add user login with form, endpoint, and test" rather than "Build the database layer" → "Build the API layer" → "Build the UI layer")
- Each step should be small enough for a single branch/PR
- Order by dependency — foundational steps first, then features, then polish
- Each step should be independently valuable and leave the project in a working state
- Use imperative mood ("Add X", "Implement Y", "Configure Z")
- Be specific about what each step delivers
- Include test expectations in the step description when relevant
- If a step is complex, break it down further

Write a PROMPT.md file in the current directory using this exact format:

```
# <Project Name>

## Goal

<Clear, concise description of the project goal>

## Context

<Current state: existing code, technologies, relevant architecture, decisions made>

## Requirements

<Key requirements, constraints, acceptance criteria, resolved trade-offs>

## Steps

- [ ] <Step 1: specific, actionable description>
- [ ] <Step 2: specific, actionable description>
- [ ] <Step 3: specific, actionable description>
...

## Learnings

## History
```

Do not ask questions. The conversation already contains everything needed. Synthesize and write the file.
