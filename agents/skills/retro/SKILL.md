---
name: retro
description: >
  Reflect on a task (this conversation plus any subagent sub-sessions it
  spawned) to find ways to improve the agent's skills and config. Use for
  "retro", "retrospective", "reflect on this conversation", "what could be
  improved", or "extract a skill from this".
---

# Retro

Run a retrospective on the task. Use what actually happened as evidence and
surface concrete improvements to the agent's own configuration. Analyze and
recommend first; apply changes only after the user approves.

## Scope

Ground the retro in every session the task touched, not only this conversation.
If the task spawned subagents or sub-sessions (stages you drove but never saw
inside), the sharpest evidence lives there: struggles, tool errors, dead-ends,
and the re-steers that unblocked them. Find and read them first (see the
`pi-sessions` skill), identifying them by the task's time window and working
directory (a task may span more than one repo); sub-sessions persist as ordinary
session files. Skim for trouble and interventions rather than reading each
verbatim. Absent sub-sessions, reflect on this conversation alone.

## Evidence to mine

Read back over the sessions for signals:

- Tool-call failures, retries, and dead ends the agent worked around.
- User corrections and re-steers ("no, do X", "I told you already").
- Expressed frustration or repeated requests for the same clarification.
- Manual or repetitive workflows the agent rebuilt from scratch that a skill
  could have supplied.
- Domain knowledge or gotchas the agent only learned mid-session.
- A skill that was loaded but lacked a detail, causing a misstep.
- Other indicators of problems or inefficiencies

## What to produce

A prioritized list of findings. For each: the evidence from the conversation,
the proposed change, and the target file. Categorize:

- **Skills to extract**: a recurring, reusable workflow not yet captured.
  Propose a name and what it would contain.
- **Skills to update**: name the existing skill and the specific detail, gotcha,
  or constraint to add so it works better next time.
- **Prompt-template / AGENTS.md / config gaps**: where appropriate.
- **Not worth encoding**: one-off mistakes that should not become permanent
  guidance. Call these out so the config does not over-fit a single incident.

Prefer changes that generalize. A single failure is not automatically a skill.

## Applying

Present findings and let the user choose what to apply. Do not edit config files
during analysis.
