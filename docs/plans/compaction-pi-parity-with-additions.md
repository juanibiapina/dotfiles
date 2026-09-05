# Make custom compaction match Pi's, plus our two sections

## Recommendation

Rewrite the hook body in
`dotfiles/pi/.pi/agent/extensions/custom-compaction.ts` to delegate to Pi's
**exported `compact()`** function instead of building its own prompt and calling
`ctx.modelRegistry.complete()`. Inject our two additions (Workflows, Skills to
reload) through `compact()`'s `customInstructions` parameter, merged with any
user-provided `/compact` instructions.

This gives all three things the request asks for, with almost no code:

- **Exact same prompt** — `compact()` uses Pi's own system prompt and its
  initial / update / split-turn prompts verbatim. Our additions ride in Pi's
  built-in `Additional focus: …` slot.
- **Conversation kept like Pi keeps it** — `compact()` returns Pi's
  `firstKeptEntryId`, does the split-turn two-summary merge, and appends the
  `<read-files>`/`<modified-files>` footers. Retained recent messages are
  identical to stock.
- **Our two additions** — appended once via `customInstructions`.

Do not copy Pi's prompt constants into the extension. Reusing `compact()` keeps
us on Pi's exact prompts with zero version-coupling.

## Why this works (background for a fresh agent)

- The extension intercepts `session_before_compact` and returns
  `{ compaction: CompactionResult }`. Pi then stores that result instead of
  running its own compaction. Calling the exported `compact()` from inside the
  hook does **not** re-fire the hook, so there is no recursion.
- `compact()` is exported from `@earendil-works/pi-coding-agent` with signature:
  `compact(preparation, model, apiKey, headers?, customInstructions?, signal?,
  thinkingLevel?, streamFn?, env?, retry?, callbacks?, sessionId?)` and returns
  `CompactionResult { summary, firstKeptEntryId, tokensBefore, usage?, details? }`.
- Internally `compact()` builds the prompt as
  `<conversation>…</conversation>` + optional `<previous-summary>…` + the base
  prompt (`SUMMARIZATION_PROMPT` for a first compaction, `UPDATE_SUMMARIZATION_PROMPT`
  when a previous summary exists), and appends `\n\nAdditional focus: ${customInstructions}`
  when `customInstructions` is set. The system prompt is `SUMMARIZATION_SYSTEM_PROMPT`.
  These are the exact strings stock Pi uses. Three of the four are not exported,
  which is why we call `compact()` rather than reassembling them.
- Everything the extension needs is available in the hook:
  - `preparation` and `signal` and `customInstructions` — on the event.
  - `model` — `ctx.model`.
  - `apiKey` / `headers` / `env` — `await ctx.modelRegistry.getApiKeyAndHeaders(model)`
    returns `{ ok, apiKey?, headers?, baseUrl?, env? }`.
  - `thinkingLevel` — `pi.getThinkingLevel()`.
- Stock Pi calls `compact()` with `sessionId` = `undefined` (a fresh routing id
  is generated inside), so passing `undefined` matches stock exactly.

## What to change and why

Replace the body of the `session_before_compact` handler:

1. Resolve the model: `const model = ctx.model`; if absent, notify and `return`
   (Pi falls back to its default compaction).
2. Resolve auth: `const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model)`;
   if `!auth.ok`, notify with `auth.error` and `return`.
3. Build the additions string from the current items 7–8 wording (Workflows and
   Skills to reload, including the "immediately re-read the listed SKILL.md
   files" imperative and the "omit when empty" rule).
4. Merge instructions: `customInstructions = [event.customInstructions, additions]
   .filter(Boolean).join("\n\n")` so a user's `/compact <focus>` and our
   additions both land in `Additional focus:`.
5. Call:
   `const result = await compact(preparation, model, auth.apiKey, auth.headers,
   customInstructions, event.signal, pi.getThinkingLevel(), undefined, auth.env,
   undefined, undefined, undefined)`.
6. `return { compaction: result }`.
7. Wrap in try/catch: on error, if not aborted, notify and `return` (fall back to
   Pi's default compaction), matching current behavior.

Remove the now-unused custom prompt, the `convertToLlm`/`serializeConversation`
assembly, the `previousContext` string, the `allMessages` combination, and the
`ctx.modelRegistry.complete()` call. Keep the `uuidv7` import only if still used
(it will not be — drop it). Add `compact` to the import from
`@earendil-works/pi-coding-agent`.

## System-wide impact

- The returned entry gains Pi's file footers and `details: { readFiles,
  modifiedFiles }`, which the current version lacks — this is desirable (closer
  to Pi).
- Iterative (update) compactions now use Pi's `UPDATE_SUMMARIZATION_PROMPT` and
  the `<previous-summary>` envelope automatically; we no longer hand-roll
  previous-summary context.
- Split turns now produce Pi's exact two-summary merge instead of one flat
  summary.

## Known limitations (accept and document)

- **Transport-level differences remain.** We pass `streamFn = undefined`, so
  `compact()` falls back to `completeSimple`. Stock Pi passes
  `agent.streamFunction`, which also applies provider-attribution headers and the
  `before_provider_headers` / `before_provider_request` hooks. The **prompt and
  summary composition are exact**; only request headers/retry wiring differ. This
  matches the request, which is about the prompt and the kept conversation.
- **No retry policy.** We pass `retry`/`callbacks` = `undefined` (the hook has no
  settings accessor), so transient-error retry that stock performs is skipped.
  Acceptable; note it.
- **`fromHook: true`** is added by Pi to extension-provided compactions — the one
  intentional persisted difference, unchanged from today.
- **Additions apply to the history summary, not the turn-prefix summary.**
  `compact()` only threads `customInstructions` into the history summary. In a
  pure split turn with no complete prior turns (history summary is
  `"No prior history."` and skipped), our Workflows/Skills sections are not
  generated for that compaction. Normal threshold/manual compactions are
  unaffected. Document this edge case.
- **`Additional focus:` placement.** Our additions are appended at the end of
  Pi's base prompt, so requesting "begin the summary with Skills to reload" may
  fight Pi's fixed format. Keep the reload imperative inside its section; treat
  strict section ordering as best-effort, not guaranteed.

## Alternatives considered

- **Copy Pi's prompt constants and reimplement the flow** (the earlier
  "copy internals" idea): achieves the same prompt but adds version-coupling and
  must be re-synced on every Pi upgrade, and still cannot reach byte-level
  transport parity. Rejected — `customInstructions` gets exact prompts for free.
- **Keep the current hand-rolled prompt** and just tweak wording: cannot match
  Pi's exact prompt or its split-turn/footer composition. Rejected — it is the
  problem being fixed.

## Test strategy

Interactive, since compaction is awkward to trigger headlessly (print mode
ignores `/compact`; auto-compaction needs large context; `ctx.compact()` +
`waitForIdle()` deadlocks):

- Load-check the rewritten file with `pi -e … --print --offline "Say only: ok"`
  (fast, proves it imports/loads).
- In a real session that loaded a skill and stated a workflow directive, run
  `/compact` and inspect:
  `jq 'select(.type=="compaction") | {fromHook, summary, details}'`. Confirm
  `fromHook: true`, Pi's structured format (## Goal … plus `<read-files>` /
  `<modified-files>` footers), the Workflows section, and the Skills-to-reload
  section with correct `SKILL.md` locations and the reload imperative.
- Run `/compact <focus text>` and confirm the user focus and our additions both
  appear (both in `Additional focus:`), proving the merge.
- Compact a second time and confirm the update prompt path works (previous
  summary is folded in) and both added sections carry forward.

## Documentation

- Update the extension header comment: it now delegates to Pi's `compact()` for
  exact-prompt parity and appends the two sections via `customInstructions`.
- If `docs/agent-configuration.md` documents this extension, note the parity
  approach and the known limitations.

## Skills to use

- `documentation` — for the additions wording and the header/docs comment.
- `git-commit` — when committing.

## Acceptance criteria

- The compaction summary is produced by Pi's exported `compact()`, so the system
  and base prompts are Pi's exact strings.
- Retained conversation (`firstKeptEntryId`), split-turn merge, and file footers
  match Pi's default compaction.
- The summary includes the Workflows and Skills-to-reload sections (via
  `Additional focus:`), and a user's `/compact` focus is preserved alongside
  them.
- On missing model, auth failure, or error, the extension falls back to Pi's
  default compaction without crashing.
- The extension no longer contains a hand-written summarization prompt or a
  direct `ctx.modelRegistry.complete()` call.
