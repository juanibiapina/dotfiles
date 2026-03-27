---
description: Find and reproduce a bug — root cause investigation without fixing
---

# Debug

Find the root cause of a bug and prove it exists. Do not fix it.

## Constraints

- Do NOT fix production code — investigation and reproduction only
- You may write tests, run commands, or add temporary instrumentation to reproduce
- Revert any temporary instrumentation before finishing

## Issue

$ARGUMENTS

## Workflow

### 1. Investigate

Gather evidence before forming theories:

- Check if any available skills relate to this task — load them for specialized workflows and constraints
- Read error messages completely — don't skip past them, they often
  contain the answer
- Reproduce consistently — can you trigger it reliably? What are the
  exact steps? If not reproducible, gather more data — don't guess
- Check recent changes — git diff, recent commits, new dependencies,
  config changes, environmental differences
- In multi-component systems, add diagnostic instrumentation at each
  boundary to narrow down WHERE it breaks before investigating WHY

### 2. Analyze

Compare what's broken against what works:

- Find working examples — locate similar working behavior in the system
- Compare against references — if the behavior implements a known
  pattern, read the reference completely
- Identify differences — list every difference between working and
  broken, however small
- Understand dependencies — what components, settings, or config does
  this need?

### 3. Hypothesize

Form a single, testable theory:

- State it explicitly: "I think X is the root cause because Y"
- Test with the smallest possible change or observation — one variable
  at a time
- If disproved, form a new hypothesis from what you learned — don't
  pile attempts on top
- If you don't know, say so — research more or ask for help

### 4. Reproduce

Prove the bug exists with a concrete reproduction:

- Write a minimal reproduction that demonstrates the bug
- Prefer a failing test when the codebase supports it
- The reproduction must encode the correct expected behavior
- If you can't reproduce it, state what additional information would help

### 5. Report

Present a clear root cause analysis:

- **Symptom**: what the user observes
- **Root cause**: the specific code, config, or condition responsible
- **Mechanism**: how the root cause produces the symptom
- **Evidence**: files, lines, logs, or the failing test
- **Scope**: what else might be affected

If the diagnosis is uncertain, say so and identify what would confirm it.

## Red Flags

If you catch yourself thinking any of these, STOP and go back to step 1:

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "I see the problem" (seeing symptoms ≠ understanding root cause)
