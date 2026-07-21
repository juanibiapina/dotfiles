---
name: orchestration
description: >
  Use when driving a multi-stage task through delegated subagents: plan, verify,
  approve, code, deploy-verify, wrap up, retro. Composes the plan, verify-plan,
  code, retro, reproducible-locally and agent-self skills into one pipeline.
  Triggers on "orchestrate", "run the pipeline", "work the task queue",
  orchestrator mode.
---

# Orchestration

Sequence a task through delegated subagent stages. Compose the role skills;
never reimplement them. The pipeline is a default you adapt per task. See
[pipeline.md](pipeline.md) for the stage table and per-stage notes.

## Judgment first

You hold structure authority. Split a task into subtasks, split the code stage
into several commits, reorder or skip stages that do not apply. The table is a
guideline, not a machine. Work one stage at a time and read each subagent's
final text before deciding the next move: advance, loop, or ask.

## Verify loop (plan must be tight)

verify-plan -> fix-plan -> re-verify until a pass reports **no blockers** (nits
may remain by judgment). Only a *tight* plan reaches the approval gate.
**Bounded**: cap ~3 rounds, then escalate to the human instead of looping. No
simplify stage exists yet; it slots between the verify loop and the gate when
authored.

## Approval gate

Once the plan is tight, present it to the human and stop. Coding resumes only on
approval. Requested changes re-enter the verify loop.

## Loose-ends loop

After code and deploy-verify, if the output reports loose ends, spawn a wrap-up
subagent with that context and re-run until an output reports none. **Bounded**:
cap ~3 iterations, then escalate. Then proceed to retro.

## Retro and self-improvement

Always run a structured retrospective (`retro`) before done. Only if it yields a
concrete improvement, enqueue a self-improvement task. Routing: code/behavior
changes -> agent repo, skill changes -> dotfiles repo; see `agent-self` for the
full rule. Every self-improvement task flows through this same pipeline and
lands only after human approval of its plan.

## Done

Before marking a task done, require a **clean working tree**
(`git status --porcelain` empty). Any leftover artifact, including the task's own
plan file, must be committed or explicitly discarded first. Record commit SHAs in
the task notes at commit time so state is durable.

## Resume

On resume, **committed-to-main is authoritative**; task notes are a hint.
Reconcile actual `git log` / `git status` against the plan before continuing.
Because SHAs were recorded at commit time, a resume reads "committed as <sha>"
instead of a stale "implementing…".

## Task selection

Work the queue one task at a time; when a task is done, pick the next. The
selection and auto-advance policy (priority order, whether to advance without
asking) is host- or future-defined.

## One host's wiring (example)

Bridge-specific tool names live only here; the sections above stay standalone. A
reader on another host ignores this block and the skill still reads complete.

```
spawn a subagent            -> run_subagent (executionMode: "sequential")
present plan, wait approval -> send_telegram_buttons (approve / request changes)
enqueue self-improvement    -> enqueue_self_improvement
queue control               -> /crew, /tasks
```

## Consistency

This skill is authoritative for the pipeline. The bridge's
`orchestration.ts` hardcodes a one-line flow summary that mirrors it; when the
pipeline changes here, keep that injected summary in sync. `agent-self` and
`reproducible-locally` are forward pointers; they do not exist yet and are
authored as their own tasks.
