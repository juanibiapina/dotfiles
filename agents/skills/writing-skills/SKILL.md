---
name: writing-skills
description: Guidance and vocabulary for writing, editing, reviewing, or pruning agent skills. Use when authoring a new skill, revising an existing one, writing a description, deciding what lives in SKILL.md versus a linked file, or diagnosing why a skill misfires.
---

# Writing Skills

Guidance for writing skills that are predictable, concise, and intent-focused. A skill's job is to make the agent take the same *process* every run, not to produce the same output. Every rule below serves that.

## State intent, not mechanics

State *what* to achieve and *why*, not *how* to execute. Trust the agent to figure out mechanics.

**Too prescriptive:**
> Step 1: Run git log to find the commit.
> Step 2: Run git cherry-pick \<hash\>.
> Step 3: If there are conflicts, run git status.

**Better:**
> Cherry-pick the commit onto a clean branch. Resolve conflicts preserving intent. If it can't land cleanly, explain why.

## Degrees of freedom

Match specificity to the task's fragility.

- **High freedom**: multiple valid approaches, context-dependent decisions. State intent: "Review the code for bugs, edge cases, and convention adherence."
- **Low freedom**: fragile operations where consistency is critical. Be exact: "Run `scripts/migrate.py --verify --backup`. Do not modify the command."

Most skills are high freedom. Use low freedom only for operations that break when done differently.

## What to include

- **Intent and constraints**: what to achieve, what to avoid
- **Domain knowledge the agent lacks**: CLI syntax, API quirks, format requirements
- **Safety rules and hard constraints**: boundaries, not prescription
- **Output expectations**: what the result should look like
- **Gotchas**: non-obvious traps ("the `/health` endpoint returns 200 even if the DB is down; use `/ready`")

CLI reference (commands, flags, examples) is fine at any length. That's knowledge, not prescription.

## Leading words

A leading word is a compact concept already in the model's pretraining that anchors a behaviour in the fewest tokens (e.g. *tight*, *red*, *tracer bullet*, *fog of war*). Repeated as a token, not restated as a sentence, it recruits priors the model already holds and makes the behaviour fire the same way every run.

Hunt for restatements a single word can retire: "fast, deterministic, low-overhead" becomes a *tight* loop. You win twice: fewer tokens, and a sharper hook for the agent.

## Prompt the positive

Steering by prohibition backfires: "don't write verbose comments" makes verbosity the pattern the agent just read. State the target behaviour instead ("write one-line comments"). Keep a prohibition only as a hard guardrail you can't phrase positively, and pair it with what to do instead.

## Completion criteria

End each step on a checkable condition: can the agent tell done from not-done? Where it matters, make it exhaustive ("every modified model accounted for", not "produce a change list"). A vague bound lets the agent declare done early.

## Progressive disclosure

Keep SKILL.md legible. Push reference the agent needs only sometimes into a linked file, reached by a pointer, so the top stays short. Inline what every run needs; disclose what only some runs reach. The pointer's wording, not its target, decides how reliably the agent reaches it.

## Keep it short

If a skill runs past ~50 lines, ask whether every line earns its place. Watch for these failure modes:

- **No-op** — a line the model already obeys by default. Test each sentence: does it change behaviour versus the default? If not, delete the whole sentence.
- **Duplication** — the same meaning in more than one place. Keep one source of truth.
- **Sediment** — stale lines that accumulate because adding feels safe and removing feels risky. Prune them.
- **Sprawl** — simply too long, even when every line is live. Cure with progressive disclosure.
- **Premature completion** — the agent ends a step before it's done because its attention slips to being done. A late, output-less step (verification, monitoring) is the one silently dropped: give it a concrete trigger, require a visible artifact, and make the stop condition a hard constraint.
