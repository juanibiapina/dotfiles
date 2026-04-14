---
description: Find and reproduce a bug through root cause investigation without fixing
---

# Debug

Find the root cause of a bug and prove it exists. Do not fix it.

## Constraints

- Do NOT fix production code
- You may add tests or temporary instrumentation to reproduce
- Revert temporary instrumentation before finishing

## Issue

$ARGUMENTS

## Workflow

### 1. Investigate

- Load relevant skills
- Read errors fully
- Reproduce the issue reliably
- Check recent changes, config, and environment differences
- Narrow down where it breaks before deciding why

### 2. Analyze

- Find working comparisons
- Read references when the behavior follows a known pattern
- List the differences between working and broken cases
- Understand the dependencies

### 3. Hypothesize

State one testable theory at a time and test it.

### 4. Reproduce

Create a concrete reproduction, ideally a failing test.

### 5. Report

Return:
- **Symptom**
- **Root cause**
- **Mechanism**
- **Evidence**
- **Scope**

If uncertain, say what would confirm it.
