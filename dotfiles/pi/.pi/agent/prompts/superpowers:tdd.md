---
description: Enforce RED-GREEN-REFACTOR test-driven development — no production code without a failing test first
---

# Test-Driven Development (TDD)

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

## Task

$ARGUMENTS

## When to Use

**Always:** New features, bug fixes, refactoring, behavior changes.

**Exceptions (ask the user):** Throwaway prototypes, generated code, configuration files.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over. No exceptions.

- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete

## Red-Green-Refactor

### RED — Write Failing Test

Write one minimal test showing what should happen.

**Requirements:** One behavior. Clear name. Real code (no mocks unless unavoidable).

```typescript
// Good — clear name, tests real behavior, one thing
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };
  const result = await retryOperation(operation);
  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```

### Verify RED — Watch It Fail

**MANDATORY. Never skip.**

Run the test. Confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature is missing (not typos)

Test passes? You're testing existing behavior. Fix the test.

### GREEN — Minimal Code

Write the simplest code to pass the test. Don't add features, refactor other code, or "improve" beyond the test.

### Verify GREEN — Watch It Pass

**MANDATORY.** Run the test. Confirm it passes and other tests still pass.

Test fails? Fix code, not test. Other tests fail? Fix now.

### REFACTOR — Clean Up

After green only: remove duplication, improve names, extract helpers.

Keep tests green. Don't add behavior.

### Repeat

Next failing test for next feature.

## Why Order Matters

**"I'll write tests after"** — Tests written after pass immediately. Passing immediately proves nothing. You never saw it catch the bug.

**"Deleting X hours of work is wasteful"** — Sunk cost fallacy. Working code without real tests is technical debt.

**"TDD is dogmatic"** — TDD IS pragmatic. It finds bugs before commit, prevents regressions, documents behavior, enables refactoring.

## Testing Anti-Patterns

### Don't test mock behavior
```typescript
// ❌ BAD: Tests that the mock exists, not that the component works
expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();

// ✅ GOOD: Test real behavior
expect(screen.getByRole('navigation')).toBeInTheDocument();
```

### Don't add test-only methods to production classes
Put test utilities in test helpers, not in production code.

### Don't mock without understanding dependencies
Before mocking: What side effects does the real method have? Does this test depend on any of them? Mock at the lowest level needed, not the highest.

### Don't create incomplete mocks
Mock the COMPLETE data structure as it exists in reality, not just fields your immediate test uses. Partial mocks fail silently when code depends on omitted fields.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = skip it" | Hard to test = hard to use. Listen to the test. |
| "TDD will slow me down" | TDD faster than debugging. |
| "Existing code has no tests" | You're improving it. Add tests. |

## Red Flags — STOP and Start Over

- Code before test
- Test after implementation
- Test passes immediately
- Can't explain why test failed
- Rationalizing "just this once"
- "Keep as reference" or "adapt existing code"
- "It's about spirit not ritual"

**All of these mean: Delete code. Start over with TDD.**

## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output pristine (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered

Can't check all boxes? You skipped TDD. Start over.

## Bug Fix Pattern

1. **RED:** Write failing test reproducing the bug
2. **Verify RED:** Watch it fail with expected error
3. **GREEN:** Fix the bug with minimal code
4. **Verify GREEN:** Test passes, all tests pass
5. **REFACTOR:** Extract if needed

Never fix bugs without a test.
