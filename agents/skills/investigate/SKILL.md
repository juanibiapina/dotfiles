---
name: investigate
description: >
  Use to find the root cause of a bug or defect in a running or deployed system
  before fixing it. Triggers on "investigate", "root cause", "why is this
  happening", "diagnose", "reproduce the bug/failure", "find the cause".
---

# Investigate

Find the cause with evidence. Investigation ends at a named cause.

## Ground truth beats hypothesis

A hypothesis picks the next probe; it is never the finding. Trust observed output over what the code should do.

Change one variable per probe, so the result attributes to a cause.

Run a positive control before treating an empty result as proof of absence: the same query against a case you know is there, since a wrong field, window, or pattern comes back clean too.

## The recipe

Order is fixed; mechanics are yours.

1. Capture one concrete failing case: the exact input, the exact wrong output. Then make it fail on demand, by a command you can rerun. A failure you can trigger at will is the instrument every later step reads; when it cannot be triggered, say so and work from recorded evidence alone.
2. Read what the running system already recorded: logs, captured output, stored session or data. Consult these artifacts before reasoning about what the code should do.
3. Narrow: halve the suspect region until one component is isolated. Recent changes and component boundaries are the first cuts.
4. Run the real failing input through the actual code path: the real function, not a reconstruction or a plausible-looking sibling. Observe the real output.
5. Trace backward from the bad output to where the bad value originated, and name that `function` / `file:line`. Prove which branch actually ran.

## Ways to cut

Pick by what the failure looks like.

- **Bisect history**, when the behaviour used to be correct. Drive `git bisect run` with the reproduction command. The commit it returns is a lead, not the cause: read its diff and keep tracing.
- **Bisect the pipeline**, when data crosses stages. Check the value at the midpoint stage: correct there puts the fault downstream, wrong puts it upstream. Repeat on the surviving half.
- **Instrument boundaries**, when several components hide which one is wrong. Log what enters and leaves each one, config and environment included, then run once. The layer where good input becomes bad output is the one to open. Log before the suspect operation, not after it fails.
- **Capture the caller chain**, when a bad value arrives from somewhere unknown. Print a stack trace plus the value at the suspect call. In tests write to stderr directly; a logger may be suppressed.
- **Diff a working case**, when something similar succeeds. Compare input, config, environment, and call order in full, and list every difference before dismissing any.
- **For intermittent failures**, suspect shared mutable state, ordering and concurrency, timing, then pollution from a neighbouring test. Run the suite one item at a time to find the polluter.
- **For "works on my machine"**, name the difference before touching code: versions, config, filesystem layout, locale, clock, credentials.

## When it resists

After a few probes that narrow nothing, widen the frame instead of repeating: name an assumption you never verified and test it.

When the evidence points outside the code (environment, timing, an external service), follow that too.

## Done

Write up the finding: the symptom, how to trigger it, the evidence trail (what you probed, what you observed, what you ruled out), and the outcome.

- **cause named**: a `file:line` backed by observed output. A cause resting on argument alone does not count.
- **inconclusive**: say what you ruled out and name the next probe.
