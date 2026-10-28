---
name: plan-review
description: Reviews an implementation plan for simplicity and design before any code is written, checking facts with verify-plan and the design with deep modules, replaceability, single responsibility, and extractable cross-cutting concerns. Use when asked to review, critique, or simplify a plan or design, or before approving a plan.
---

# Plan Review

The goal is the *smallest* design that fully meets the requirements. A plan is cheap to change and code is not, so this is where complexity gets removed. Load `verify-plan`, `deep-modules`, and `vocabulary`, and use their terms.

## Verify

Run `verify-plan` on the plan: every claim about the code, platform, and libraries is checked against the source, with evidence.

## Review the design

Read the code the plan touches before judging it. For each question, a finding names the part of the plan, the evidence, and the simpler design.

- **Existing mechanisms**: what does the codebase or platform already do that this plan rebuilds? Retries, queues, schedules, validation, and storage often exist already. The plan should reuse them.
- **Moving parts**: list every new piece of state, timer, queue, background task, table, or config. Each one needs a requirement that no smaller design meets. Look hardest at work that runs later or concurrently, since it creates races and stale-state cases that later need defensive code.
- **Deep modules**: is each new module deep, with a small interface over real behaviour? Apply the deletion test. Flag pass-throughs, interfaces that leak their implementation, and seams with only one adapter.
- **Replaceability**: which parts could a library, a platform feature, or an existing module replace? Which parts would be hard to swap or remove later, and is that cost needed?
- **Single responsibility**: does each module have one reason to change? Flag modules that mix concerns, such as domain logic with retry bookkeeping or transport with formatting.
- **Cross-cutting concerns**: is part of the plan a generic concern, such as background jobs, retries, rate limits, or auditing, written inline for one feature? Say whether it should become one generic module that this and later features use, or whether a design without it is simpler still.

## Report

Lead with a verdict: the plan is as simple as it can be, or it should change. For each finding give the problem, the evidence (`file:line`, doc, or probe), and the simpler alternative, in a few sentences. When a different overall design is simpler, describe it first, because it makes many smaller findings moot.

When nothing is found, say so in one line.
