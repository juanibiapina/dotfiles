# Share custom compaction with the Telegram agent

## Status

Implemented and verified locally on 2026-09-16. The live Telegram bridge has not
been restarted, so existing bridge sessions still use the previous resource
loader until the user requests `/restart`.

## Goal

Use one custom-compaction implementation for normal interactive pi and
`juanibiapina/agent`, preserve the active plan and relevant skills across every
compaction, and cap the affected GPT context windows at 272,000 tokens.

The canonical implementation remains
`dotfiles/pi/.pi/agent/extensions/custom-compaction.ts`. The Telegram bridge
must load that installed extension explicitly rather than copy it into the
agent repository. This keeps the `session_before_compact` interface deep: one
implementation owns stock-compaction delegation, reload instructions, fallback
behavior, and future fixes for both callers.

## Current state

- Normal pi auto-discovers `~/.pi/agent/extensions/custom-compaction.ts` through
  the Stow link to the dotfiles repository.
- The extension delegates summary generation and retained-message selection to
  pi's exported `compact()` function. It adds `Workflows` and
  `Skills to reload` instructions through pi's `customInstructions` seam.
- The Telegram bridge creates a `DefaultResourceLoader` with
  `noExtensions: true` and explicitly allows only `deltoids.ts`. It therefore
  uses stock compaction today.
- The bridge uses `~/.pi/agent/models.json`, so the model overrides in the
  dotfiles repository affect both normal pi and bridge sessions.
- At planning time, seven entries in `models.json` set `contextWindow` to `872000`: four
  `openai-codex` overrides (`luna`, `sol`, `terra`, and `astra`) and three
  Contentful AI Gateway GPT definitions (`luna`, `sol`, and `terra`).
- The bridge's bundled `@earendil-works/pi-coding-agent@0.82.1` loads the current
  extension without diagnostics and registers `session_before_compact`. Normal
  pi currently runs version 0.84.4.

## What to change and why

### 1. Make the compaction summary restore skills and the active plan

Update `ADDITIONS` and the header comment in
`dotfiles/pi/.pi/agent/extensions/custom-compaction.ts` while retaining the
existing call to pi's exported `compact()`.

The additional summary instructions must define three conditional sections:

1. `Workflows` keeps the existing standing-procedure behavior.
2. `Skills to reload` lists only the names of skills relevant to continuing the
   current work and includes no `SKILL.md` paths in that section. The section starts with an
   imperative that the continuing agent **must find and re-read** every listed
   skill before doing more work. A later compaction carries a previously listed
   skill forward only while it remains relevant.
3. `Plan to reload` appears when the session is following a written plan. It
   includes the exact durable reference, preferably the repository-relative or
   absolute plan-file path, plus the current plan checkpoint when known. The
   section starts with an imperative that the continuing agent **must re-read**
   that plan before doing more work. Later compactions retain the reference
   while the plan remains active and drop it after completion or abandonment.

The prompt must not invent skill names or plan references. It must omit any of
the three sections when no real content exists. It must continue merging a
user's `/compact <focus>` text with these standing instructions.

At the start of the hook, send `Compacting conversation context…` through
`ctx.ui.notify`. The bridge's existing Telegram UI adapter turns that notification
into a Telegram message, while normal pi displays it in the TUI.

Do not parse plans or skill reads in bridge code. The compacted conversation and
previous summary already contain skill blocks, file reads, and prior reload
sections. Keeping this policy inside the compaction module gives both runtimes
the same behavior and one source of truth.

### 2. Allow-list the shared extension in every bridge resource loader

Update `apps/bot/src/session/resources.ts` in
`/home/juan/workspace/juanibiapina/agent`:

- Add a path for `<agentDir>/extensions/custom-compaction.ts` beside the existing
  deltoids path.
- Pass both paths through `additionalExtensionPaths` while retaining
  `noExtensions: true`.
- Update the resource-loader comment to state why both extensions are safe:
  neither owns background timers or widgets, and custom compaction uses only
  the per-event context.

Do not enable global extension discovery. The prior stale-context crashes came
from interactive extensions that captured session context across bridge session
swaps. Explicit allow-listing preserves that safety constraint.

The same `createBridgeResourceLoader` call is used for Telegram sessions and
standalone scheduled sessions, so this change covers both without another
adapter. Existing sessions require a bridge restart because their extension
runners were created before the new path was present.

### 3. Restore the explicit 272,000-token context cap

Change all seven `872000` context-window values in
`dotfiles/pi/.pi/agent/models.json` to `272000`.

Retain the four `openai-codex.modelOverrides` entries as an explicit policy cap.
The installed catalogs currently report 272,000 for these Codex models, but the
overrides prevent a future dynamic-catalog refresh from silently raising the
limit again. Keep every `maxTokens` value at `128000`; this change affects input
context size, not maximum output size.

With the default 16,384-token compaction reserve, automatic compaction will
start above approximately 255,616 context tokens instead of approximately
855,616 tokens.

### 4. Document the bridge behavior once

Add a concise `Compaction` section to the agent repository's `AGENTS.md`. State
that the bridge keeps global extension discovery disabled, explicitly loads the
shared dotfiles custom-compaction extension, and preserves relevant skill and
active-plan references. Keep the detailed summary format in the extension's
header and prompt so it remains the single source of truth.

Update the comments and test names in `apps/bot/src/session/resources.ts` and
`resources.test.ts` that currently say deltoids is the only loaded extension.
No user-facing command documentation changes because the bridge is gaining
automatic compaction behavior, not a new Telegram command.

## Out of scope

- Do not add a Telegram `/compact` command.
- Do not customize branch summaries from `/tree`; this change covers
  `session_before_compact` only.
- Do not copy the extension into the agent repository or create a second prompt.
- Do not enable other global pi extensions in bridge sessions.
- Do not replace pi's cut-point, split-turn, file-footer, fallback, or persisted
  compaction behavior.
- Do not upgrade the bridge's pi SDK solely for this change.
- Do not change Anthropic context windows or any model's output-token limit.
- Do not remove the existing compaction notification or fallback warnings.

## Tests to add or update

### Automated bridge checks

Update `apps/bot/src/session/resources.test.ts` at the resource-loader interface:

- Build a temporary agent directory containing minimal deltoids and custom
  compaction extension fixtures plus an unrelated global extension.
- Assert that exactly the two allow-listed paths load while the unrelated
  extension remains disabled.
- Assert that deltoids registers its `edit` tool and custom compaction registers
  a `session_before_compact` handler.
- Keep a missing-files case to prove absent optional extension files do not load
  arbitrary global extensions or crash resource loading.

Run:

```bash
cd /home/juan/workspace/juanibiapina/agent
pnpm --filter @repo/bot test
pnpm --filter @repo/bot typecheck
pnpm --filter @repo/bot lint
```

### Cross-runtime compatibility checks

1. Load the real installed extension with normal pi and confirm it registers
   without diagnostics.
2. Load the same file through the bridge's bundled 0.82.1 resource loader and
   assert that `session_before_compact` is present with no loader errors.
3. In a throwaway normal-pi session, load at least one relevant skill, state
   that work follows this plan, read this plan file, and trigger `/compact`.
   Inspect the persisted compaction entry and confirm:
   - `fromHook` is `true`;
   - the stock structured summary and file footers remain present;
   - `Skills to reload` contains each relevant skill name, no `SKILL.md` path
     within that section, and a mandatory re-read instruction;
   - `Plan to reload` contains
     `docs/plans/add-agent-custom-compaction.md`, the current checkpoint, and a
     mandatory re-read instruction.
4. Run one temporary bridge SDK session through `session.compact()` with the
   shared extension loaded. Inspect its persisted entry for the same reload
   sections. This proves runtime execution against the bridge's older bundled
   SDK without requiring a Telegram `/compact` command.
5. Compact a second time and confirm that the relevant skills and active plan
   reference carry forward. Mark the plan complete in a separate throwaway
   case and confirm the plan section is then omitted.

### Model checks

Parse `models.json` and assert that all seven targeted `contextWindow` values
are exactly `272000`. Then verify both runtime views:

- `pi --list-models` reports 272K for the affected normal-pi models.
- The bridge's `ModelRuntime` resolves the four `openai-codex` models at 272,000
  after a catalog refresh, including dynamically discovered `gpt-6-astra`.

## Deployment order

1. Apply the dotfiles change with `gob run make` so the extension and model
   configuration are present at `~/.pi/agent/`.
2. Complete the agent repository tests and commit both repositories.
3. Do not restart the Telegram bridge during implementation. When the user later
   requests activation, use `/restart`, not `gob restart` or `gob stop`, so
   session state is preserved.
4. After that future restart, start a new bridge session or recreate the test
   session before verifying the live allow-list and 272,000-token model metadata.

## Skills to use

- `vocabulary` — keep module, interface, seam, adapter, and locality terms
  consistent during implementation and review.
- `deep-modules` — preserve one compaction implementation behind the extension
  event interface instead of duplicating bridge behavior.
- `documentation` — keep detailed behavior in one source of truth and update
  the durable bridge instructions.
- `testing` — cover resource loading through its public interface and design the
  cross-SDK compaction smoke test.
- `reproducible-locally` — turn the two runtime smoke checks into repeatable
  commands with inspectable compaction entries.
- `git-commit` — validate and commit each repository after implementation.

## Acceptance criteria

- Normal pi and every newly created bridge session load the same
  `custom-compaction.ts` implementation.
- Global bridge extension discovery remains disabled; only deltoids and custom
  compaction are allow-listed.
- A compaction summary tells the continuing agent that it must find and re-read
  every relevant skill, and its `Skills to reload` section lists only skill names.
- Starting bridge compaction sends `ℹ️ Compacting conversation context…` to the
  Telegram topic before summary generation.
- A compaction performed while following a written plan includes the exact plan
  reference, the current checkpoint when known, and an instruction that the
  continuing agent must re-read the plan.
- Repeated compactions preserve still-relevant skills and the still-active plan,
  without retaining completed or irrelevant entries.
- Pi's stock compaction prompt structure, retained-message selection, split-turn
  handling, file footers, and fallback behavior remain intact.
- All seven targeted GPT model entries resolve to a 272,000-token context window
  in normal pi and the Telegram bridge; output limits remain 128,000.
- Bridge tests, type checking, and linting pass, and both runtime compaction smoke
  checks produce inspectable persisted entries with the required references.
