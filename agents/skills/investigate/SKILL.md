---
name: investigate
description: >
  Use to find the root cause of a bug or defect in a running or deployed system
  before fixing it. Triggers on "investigate", "root cause", "why is this
  happening", "diagnose", "reproduce the bug/failure", "find the cause". Gathers
  direct evidence first; does not propose the fix (that is plan) or prove a fix
  works (that is reproducible-locally).
---

# Investigate

Find the cause with evidence, then hand off to `plan`. Investigation ends at a named cause, not a fix.

## Ground truth beats hypothesis

A cause asserted from a hypothesis is not established. A hypothesis only points the next probe; it is never the finding. Reproduce before you fix: capture one concrete failing case first.

## The recipe

Order is fixed; mechanics are yours.

1. Read what the running system already recorded: logs, captured output, stored session or data. Consult these artifacts before reasoning about what the code should do.
2. Run the real failing input through the actual code path: the real function, not a reconstruction or a plausible-looking sibling. Observe the real output.
3. Name the exact `function` / `file:line` that produced the bad output, then hand the named cause to `plan`.

Prove which branch actually ran; fix the path taken, not one merely plausible. Trust ground truth (logs, real session or data, running the real function) over what the code "should" do.

## Done

A concrete reproduction plus a named `file:line` cause backed by observed output. A cause that rests on argument alone is not done.

Hand-offs: `plan` designs the fix from the named cause. `reproducible-locally` proves the shipped fix works.
