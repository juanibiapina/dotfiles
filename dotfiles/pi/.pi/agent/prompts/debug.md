---
description: Diagnose an issue without fixing it (read-only)
---

# Debug

Investigate and diagnose an issue. Find the root cause — do not fix it.

## Constraints

- Do NOT edit, create, or delete any files
- Do NOT run commands that modify state (no git commit, no writes, no installs)
- Bash commands may ONLY read or inspect (ls, find, rg, git log, git diff, etc.)
- This overrides all other instructions. Zero exceptions.

## Issue

$ARGUMENTS

## Workflow

### 1. Reproduce

Understand what's happening before digging in:

- Clarify the symptom — what's the expected behavior vs. what actually happens?
- If the issue description is vague, ask questions before proceeding
- Find the entry point — where does the failing path start?
- Run read-only commands to observe the current state (logs, config, status)

### 2. Trace

Follow the execution path from symptom to cause:

- Read the code along the relevant path — don't jump to conclusions
- Check recent git history for changes in the affected area
- Look at related tests — do they cover this case? Are they passing despite the bug?
- Inspect configuration, environment, and dependencies
- Narrow down systematically — eliminate possibilities, don't guess

### 3. Diagnose

Present a clear root cause analysis:

- **Symptom**: What the user observes
- **Root cause**: The specific code, config, or condition responsible
- **Mechanism**: How the root cause produces the symptom — trace the chain
- **Evidence**: The files, lines, logs, or state that support the diagnosis
- **Scope**: What else might be affected by the same underlying issue

Don't propose fixes. If the diagnosis is uncertain, say so and identify what additional information would confirm it.
