---
description: Systematic 4-phase debugging — root cause investigation before any fixes
---

# Systematic Debugging

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

## Issue

$ARGUMENTS

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## The Four Phases

Complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read error messages carefully**
   - Don't skip past errors or warnings — they often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce consistently**
   - Can you trigger it reliably? What are the exact steps?
   - If not reproducible → gather more data, don't guess

3. **Check recent changes**
   - Git diff, recent commits
   - New dependencies, config changes, environmental differences

4. **Gather evidence in multi-component systems**
   When the system has multiple components, add diagnostic instrumentation at each boundary BEFORE proposing fixes:
   - Log what data enters and exits each component
   - Verify environment/config propagation
   - Run once to gather evidence showing WHERE it breaks
   - Then investigate that specific component

5. **Trace data flow (root cause tracing)**
   When error is deep in the call stack:
   - Start at the symptom: what code directly causes the error?
   - Ask: what called this? What value was passed?
   - Keep tracing upward until you find where the bad value originates
   - Fix at the source, not at the symptom
   - Add `new Error().stack` instrumentation if you can't trace manually

### Phase 2: Pattern Analysis

1. **Find working examples** — locate similar working code in the same codebase
2. **Compare against references** — if implementing a pattern, read the reference COMPLETELY
3. **Identify differences** — list every difference between working and broken, however small
4. **Understand dependencies** — what components, settings, config does this need?

### Phase 3: Hypothesis and Testing

1. **Form single hypothesis** — "I think X is the root cause because Y"
2. **Test minimally** — smallest possible change, one variable at a time
3. **Verify before continuing** — worked? → Phase 4. Didn't work? → new hypothesis. DON'T add more fixes on top.
4. **When you don't know** — say so. Research more. Ask for help.

### Phase 4: Implementation

1. **Create failing test case** — simplest possible reproduction, automated if possible.
2. **Implement single fix** — address the root cause. ONE change at a time. No "while I'm here" improvements.
3. **Verify fix** — test passes? No other tests broken? Issue actually resolved?
4. **If fix doesn't work:**
   - If < 3 attempts: return to Phase 1 with new information
   - **If ≥ 3 attempts: STOP and question the architecture.** Each fix revealing new problems = wrong architecture, not wrong fix. Discuss with the user before attempting more.

5. **Defense in depth** — after fixing root cause, add validation at multiple layers:
   - **Entry point:** Reject invalid input at API boundary
   - **Business logic:** Ensure data makes sense for the operation
   - **Environment guards:** Prevent dangerous operations in specific contexts (e.g., refuse destructive actions in test/prod)
   - **Debug instrumentation:** Log context for future forensics

   Single validation can be bypassed by different code paths. Multiple layers make the bug structurally impossible.

## Red Flags — STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Here are the main problems: [lists fixes without investigation]"
- "One more fix attempt" (when already tried 2+)

**ALL of these mean: STOP. Return to Phase 1.**

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple" | Simple issues have root causes too. Process is fast. |
| "Emergency, no time" | Systematic is FASTER than guess-and-check. |
| "Just try this first" | First fix sets the pattern. Do it right. |
| "I'll write test after" | Untested fixes don't stick. Test first. |
| "Multiple fixes saves time" | Can't isolate what worked. Causes new bugs. |
| "I see the problem" | Seeing symptoms ≠ understanding root cause. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| 1. Root Cause | Read errors, reproduce, check changes, trace data | Understand WHAT and WHY |
| 2. Pattern | Find working examples, compare | Identify differences |
| 3. Hypothesis | Form theory, test minimally | Confirmed or new hypothesis |
| 4. Implementation | Create test, fix, verify, add layers | Bug resolved, tests pass |
