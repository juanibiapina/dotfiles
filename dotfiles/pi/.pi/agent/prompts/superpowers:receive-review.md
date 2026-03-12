---
description: Handle code review feedback with technical rigor — verify before implementing, push back when wrong
---

# Receiving Code Review

Code review requires technical evaluation, not emotional performance.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## Review Feedback

$ARGUMENTS

## The Response Pattern

1. **READ:** Complete feedback without reacting
2. **UNDERSTAND:** Restate requirement in own words (or ask)
3. **VERIFY:** Check against codebase reality
4. **EVALUATE:** Technically sound for THIS codebase?
5. **RESPOND:** Technical acknowledgment or reasoned pushback
6. **IMPLEMENT:** One item at a time, test each

## Forbidden Responses

**NEVER:**
- "You're absolutely right!" (performative)
- "Great point!" / "Excellent feedback!" (performative)
- "Let me implement that now" (before verification)

**INSTEAD:**
- Restate the technical requirement
- Ask clarifying questions
- Push back with technical reasoning if wrong
- Just start working (actions > words)

## Handling Unclear Feedback

If ANY item is unclear: **STOP** — do not implement anything yet. Ask for clarification on unclear items.

Items may be related. Partial understanding = wrong implementation.

**Example:**
```
Reviewer gives items 1-6.
You understand 1,2,3,6. Unclear on 4,5.

❌ WRONG: Implement 1,2,3,6 now, ask about 4,5 later
✅ RIGHT: "Understand 1,2,3,6. Need clarification on 4,5 before proceeding."
```

## Source-Specific Handling

### From the User
- Trusted — implement after understanding
- Still ask if scope unclear
- Skip to action or technical acknowledgment

### From External Reviewers
Before implementing:
1. Technically correct for THIS codebase?
2. Breaks existing functionality?
3. Reason for current implementation?
4. Works on all platforms/versions?
5. Does reviewer understand full context?

If suggestion seems wrong: push back with technical reasoning.

If conflicts with user's prior decisions: stop and discuss with user first.

## YAGNI Check

If reviewer suggests "implementing properly":
- Check codebase for actual usage
- If unused: "This isn't called. Remove it (YAGNI)?"
- If used: implement properly

## Implementation Order

For multi-item feedback:
1. Clarify anything unclear FIRST
2. Then implement in order:
   - Blocking issues (breaks, security)
   - Simple fixes (typos, imports)
   - Complex fixes (refactoring, logic)
3. Test each fix individually
4. Verify no regressions

## When to Push Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Legacy/compatibility reasons exist
- Conflicts with user's architectural decisions

**How:** Technical reasoning, not defensiveness. Specific questions. Reference working tests/code.

## Acknowledging Correct Feedback

```
✅ "Fixed. [Brief description of what changed]"
✅ "Good catch — [specific issue]. Fixed in [location]."
✅ [Just fix it and show in the code]

❌ "Thanks for catching that!" (performative)
❌ ANY gratitude expression — actions speak louder
```

## Gracefully Correcting Your Pushback

If you pushed back and were wrong:
```
✅ "You were right — I checked [X] and it does [Y]. Implementing now."
❌ Long apology or defending why you pushed back
```

State the correction factually and move on.
