# Preserve workflows and active skills across compaction

## Recommendation

Extend the summarization prompt in
`dotfiles/pi/.pi/agent/extensions/custom-compaction.ts` with two new
LLM-generated sections so that process and behavior survive a compaction:

1. A **Workflows** section that captures the user's process/workflow directives
   (how work should be carried out), merged forward from any prior summary.
2. A **Skills to reload** section that lists the skills active in the session
   with their `SKILL.md` locations and an imperative directive to re-read them
   immediately after compaction, so communication style and other skill-driven
   behavior are restored rather than silently dropped.

Both sections are produced by the summarizer model through prompt instructions.
No code-side detection is added; the model extracts both from the conversation
it is already given.

## Background and constraints (for a fresh agent)

- The extension replaces Pi's default compaction via the
  `session_before_compact` hook. It serializes the messages being summarized,
  asks the current session model for a structured summary, and returns
  `{ compaction: { summary, firstKeptEntryId, tokensBefore, usage } }`. The
  returned `summary` becomes the compaction entry and is the only carried-over
  representation of the discarded history.
- `previousSummary` (the prior compaction's summary) is available on
  `preparation` and is already injected into the prompt as context. Carry-forward
  of any section works by instructing the model to merge the prior summary.
- Why this matters: after compaction the discarded history includes the skill
  blocks that established behavior (e.g. the communication/caveman skill loaded
  per the repo's AGENTS.md). The rebuilt context keeps only the system prompt's
  short skill *descriptions* plus the summary. Without an explicit reload
  directive the agent reverts to default phrasing and drops skill-driven
  conventions.
- What makes an LLM-listed skills section feasible: when a skill loads, Pi
  injects a message of the form `<skill name="NAME" location="PATH">…</skill>`,
  and these blocks are part of the serialized conversation the summarizer
  receives. So the model can read the skill names and their exact `SKILL.md`
  locations directly from the conversation text.
- "As soon as compaction happens, reload" has no forcing hook inside
  `session_before_compact`; the summary is context, not an action. The lever is a
  strong imperative placed in the summary that the next agent will read as it
  rebuilds context.

## What to change and why

Edit only the summarization prompt string (the numbered list of what the summary
must capture, and the format instruction). Two additions:

### 1. Workflows section

Add an instruction telling the summarizer to capture **workflow directives**:
standing instructions from the user about *how* work is performed and carried
out — procedures, sequencing, conventions, and habits the agent must keep
following. Require it to:

- Preserve any Workflows content already present in the previous summary and
  merge new directives into it.
- Record only directives actually established in the conversation; invent
  nothing. Do not seed the prompt with concrete examples — examples bias the
  model toward fabricating workflows.
- Omit the section cleanly when no workflow directive was given (no empty
  scaffolding).

### 2. Skills to reload section

Add an instruction telling the summarizer to list the skills active in the
session so they can be restored. Require it to:

- Identify skills from the conversation, including the `<skill name="…"
  location="…">` blocks, and list each by name with its exact `SKILL.md`
  location copied verbatim.
- For each skill, add a short note on its purpose (when to use it), in the
  spirit of how plan mode states which skill to use for which purpose.
- Merge forward any skills listed in the previous summary's Skills-to-reload
  section, so skills loaded before an earlier compaction are not lost.
- Lead the section with an imperative directive, e.g. "Immediately re-read these
  `SKILL.md` files to restore their behavior before continuing." Place the
  section so the directive is prominent (e.g. near the top of the summary).
- Omit the section cleanly when no skills were active.

Also update the format instruction so the model emits these as clearly headed
markdown sections alongside the existing ones.

## Alternatives considered

- **Deterministic skill detection in code** (scan messages with Pi's exported
  `parseSkillBlock`, append a footer): more reliable listing, but rejected here
  per decision to keep both sections LLM-based and the extension simple. The
  risk to accept: the model may occasionally miss or mis-copy a skill location;
  mitigate with an explicit instruction to copy locations verbatim.
- **Force a reload turn via `session_compact` + `sendUserMessage`**: makes the
  reload "just happen" without relying on the model reading a directive, at the
  cost of an extra turn per compaction and possible interaction with overflow
  recovery. Deferred; revisit only if the summary directive proves insufficient.

## Test strategy

End-to-end compaction is awkward to trigger non-interactively (print mode does
not process `/compact`; auto-compaction needs a large context; the earlier
`ctx.compact()` + `waitForIdle()` trick deadlocks). Verify interactively:

- Stow, open a real session that loaded at least one skill and stated a workflow
  directive, run `/compact`, and inspect the entry:
  `jq 'select(.type=="compaction") | {fromHook, summary}'`. Confirm `fromHook:
  true`, a Workflows section reflecting the stated directive with nothing
  fabricated, and a Skills-to-reload section listing the loaded skill(s) with
  correct `SKILL.md` locations under an imperative reload directive.
- Carry-forward: compact a second time and confirm both sections persist (the
  workflow directive and the skills list from the first summary are not
  dropped).
- Empty cases: in a session with no skills and no workflow directive, confirm the
  summary does not emit empty or fabricated sections.

## Documentation

- Update the extension's header comment to describe the Workflows and
  Skills-to-reload sections.
- If `docs/agent-configuration.md` documents this extension's behavior, note the
  two new sections there.

## Skills to use

- `documentation` — for the prompt wording and the header/docs comment.
- `git-commit` — when committing.

## Acceptance criteria

- A compaction summary produced by the extension contains a Workflows section
  reflecting workflow directives actually stated by the user, with no fabricated
  examples, merging any prior Workflows content.
- The summary contains a Skills-to-reload section listing the active skills with
  their `SKILL.md` locations and a short purpose each, led by an imperative
  reload directive, and merging the prior summary's list.
- Both sections carry forward across successive compactions.
- Neither section appears as empty scaffolding when there is nothing to capture.
