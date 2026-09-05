# Build a configurable copy of Pi compaction

## Verification findings (Pi 0.84.4, adversarial review)

Source read from the installed package at
`/nix/store/dmk4wsy7x2m6f3xqhvsmrlm7gk5rbpbc-pi-0.84.4/lib/pi`.

### BLOCKER — "equality of the stock CLI's model request" is unreachable

The Recommendation defines exact parity as "equality of the stock CLI's model
request" while also conceding the hook cannot access `agent.streamFn`. Those two
statements contradict each other: the stock CLI's request *is* produced by that
`streamFn`.

Evidence:
- `dist/core/agent-session.js:1451` calls
  `compact(preparation, requestModel, apiKey, headers, customInstructions, signal, this.thinkingLevel, this.agent.streamFunction, ...)`.
- `dist/core/sdk.js:185-249` defines that `streamFunction`. It wraps
  `modelRuntime.streamSimple` and adds provider-attribution headers
  (`mergeProviderAttributionHeaders`), the `before_provider_headers` hook, the
  `before_provider_request` hook (`onPayload`), retry/timeout/websocket
  settings, `transport`, and `thinkingBudgets`.
- When the copied `compact()` runs with `streamFn === undefined`, it falls back
  to `completeSimple` (`dist/core/compaction/compaction.js:462-464`), which adds
  none of that.

Consequence: request headers and retry behavior will differ from the stock CLI.
The three "inherent differences" the plan allows (`fromHook`, credential
re-resolution, no `streamFn`) actually make request-level equality impossible,
not merely cosmetic. Fix: narrow the parity definition to summary composition,
cut point, token count, file metadata, and resumed context — and explicitly
exclude transport-level request/header equality. Do not claim request equality.

### BLOCKER — step 5's `streamSimple` claim is false

Step 5 says "Use Pi AI's exported `streamSimple`, matching the stock CLI path."
The stock path does not use pi-ai's top-level `streamSimple`. It uses
`modelRuntime.streamSimple` inside the closure above, and the copied code's own
fallback is `completeSimple` from `@earendil-works/pi-ai/compat`
(`compaction.js:8,462-464`). If a copy is made, mirror `completeSimple`, not
`streamSimple`. Either way, see the blocker above: neither reproduces the stock
request.

### MAJOR — the copy-the-internals approach may be unnecessary

`compact()`, `generateSummaryWithUsage()`, and `generateSummary()` are already
exported (`dist/index.d.ts:5`). The only reason to copy them is that the prompts
are hardcoded module constants that `compact()` does not accept as parameters.
The official example `examples/extensions/custom-compaction.ts` gets configurable
behavior in ~100 lines using `ctx.modelRegistry.complete()` and its own prompt,
with no copying and no version coupling. The plan trades that simplicity for byte
parity it cannot fully reach (blockers above). Decide whether byte parity is a
real requirement. If the goal is "edit the prompts," the example approach is far
cheaper. If parity of the summarization request body matters, copy only
`generateSummaryWithUsage` + `compact` (small) and call `completeSimple`.

### MINOR — step 3 says "concurrently"; the real code is sequential

`compaction.js:618-622` awaits the history summary, then awaits the turn-prefix
summary. It is not `Promise.all`. Step 7 asserts "completion ordering," so this
matters. Replicate the sequential order.

### MINOR — maxTokens formula is incomplete

Actual history budget: `Math.min(Math.floor(0.8 * reserveTokens), model.maxTokens > 0 ? model.maxTokens : Infinity)`
(`compaction.js:524`). Turn-prefix budget uses `0.5` with the same shape
(`compaction.js:651`). Step 2 drops the `Math.floor` and the `> 0` guard.
Replicate exactly.

### MINOR — `ctx.model` may be undefined

`dist/core/extensions/types.d.ts:222` types it `Model<any> | undefined`. Step 5's
`ctx.modelRegistry.getApiKeyAndHeaders(ctx.model)` needs an undefined guard; the
stock path resolves a `requestModel` first.

### MINOR — three of four prompts are not exported

Only `SUMMARIZATION_SYSTEM_PROMPT` is exported
(`dist/core/compaction/utils.d.ts:37`). `SUMMARIZATION_PROMPT`,
`UPDATE_SUMMARIZATION_PROMPT`, and `TURN_PREFIX_SUMMARIZATION_PROMPT` are
module-local consts in `compaction.js`. Step 1's byte-exact capture must lift
them from the compiled `dist` source, not import them.

### Verified correct

- `session_before_compact` hook and event shape (`preparation.*`,
  `customInstructions`, `signal`, `reason`, `willRetry`) — `docs/compaction.md`,
  `docs/extensions.md`, and `examples/extensions/custom-compaction.ts`.
- Auto-load path `~/.pi/agent/extensions/<name>/index.ts` — `docs/extensions.md:118`.
- Return shapes `{ compaction: { summary, firstKeptEntryId, tokensBefore, usage, details } }`
  and `{ cancel: true }` — docs + example.
- `fromHook` legacy field on `CompactionEntry` — `docs/compaction.md`.
- `convertToLlm`, `serializeConversation` exports — `dist/index.d.ts:10,5`.
- `ctx.modelRegistry.{getApiKeyAndHeaders,complete,find}` — `dist/core/model-registry.d.ts`.
- `pi.getThinkingLevel()` — `dist/core/extensions/types.d.ts:1005`.
- Reasoning gated on `model.reasoning && thinkingLevel !== "off"` — `compaction.js` `createSummarizationOptions`.
- Prompt envelope order (`<conversation>`, then `<previous-summary>`, then base
  prompt; `Additional focus:` appended to the base prompt) — `compaction.js:488-506`.
- Split-turn constants: `"No prior history."` fallback, separator
  `\n\n---\n\n**Turn Context (split turn):**\n\n` — `compaction.js:615,624`.
- File footers `<read-files>`/`<modified-files>`, read-only excludes modified,
  both sorted, `details: { readFiles, modifiedFiles }` — `utils.js:52-65`,
  `compaction.js:634-635`.

## Recommendation

Add an auto-loaded extension at
`dotfiles/pi/.pi/agent/extensions/custom-compaction/`. Copy Pi 0.84.4's
compaction logic into the extension and intercept `session_before_compact`.
Ship Pi's current prompts unchanged as Markdown files. The first version should
therefore reproduce current compaction behavior while making prompt changes
straightforward.

Continue using `event.preparation`. Pi remains responsible for choosing the cut
point and retained recent context. The extension will duplicate summary request
construction, split-turn handling, file metadata, and result assembly.

“Exact parity” means equality of the stock CLI's model request, summary
composition, cut point, token count, file metadata, and resumed context. Two
differences are inherent to the extension API:

- Pi writes `fromHook: true` on the compaction entry.
- The hook resolves credentials again because `session_before_compact` does not
  expose the credentials already resolved by `AgentSession`.

The parity target is the stock Pi CLI. An SDK host can inject a private
`agent.streamFn`; the hook API does not expose that function.

## Proposed files

- `dotfiles/pi/.pi/agent/extensions/custom-compaction/index.ts`
  - Register `session_before_compact`.
  - Resolve the current model, authentication, headers, thinking level, and
    abort signal.
  - Run the copied compaction implementation and return `{ compaction }`.
- `dotfiles/pi/.pi/agent/extensions/custom-compaction/compaction.ts`
  - Duplicate Pi 0.84.4's `compact()`, `generateSummary()`, split-turn summary,
    request options, completion, and result assembly.
- `dotfiles/pi/.pi/agent/extensions/custom-compaction/config.ts`
  - Resolve and validate prompt file paths.
- `dotfiles/pi/.pi/agent/extensions/custom-compaction/prompts.ts`
  - Load the four prompt files and expose a typed prompt set.
- `dotfiles/pi/.pi/agent/extensions/custom-compaction/test/*.test.ts`
  - Request-parity, configuration, and session integration tests.
- `dotfiles/pi/.pi/agent/custom-compaction.json`
  - Map prompt names to files.
- `dotfiles/pi/.pi/agent/compaction-prompts/{system,initial,update,split-turn}.md`
  - Exact Pi 0.84.4 prompt text, including whitespace.
- `docs/agent-configuration.md`
  - Document configuration, prompt files, and Pi version coupling.

Use this configuration shape:

```json
{
  "prompts": {
    "system": "~/.pi/agent/compaction-prompts/system.md",
    "initial": "~/.pi/agent/compaction-prompts/initial.md",
    "update": "~/.pi/agent/compaction-prompts/update.md",
    "splitTurn": "~/.pi/agent/compaction-prompts/split-turn.md"
  }
}
```

Read configuration for each compaction so prompt edits take effect immediately.
Support `<cwd>/.pi/custom-compaction.json` as a project override. Reject invalid
configuration, unreadable files, and empty prompts with clear errors.

## Implementation steps

1. **Create deterministic parity fixtures.**
   - Capture Pi 0.84.4's current prompt constants and relevant compaction source
     from the installed package.
   - Use a deterministic fake API provider to record the model context and
     request options.
   - Cover an initial summary, an update from a previous summary,
     `/compact <instructions>`, a split turn, reasoning, request headers,
     read-only files, modified files, and cancellation.
   - Normalize request timestamps only.

2. **Copy the compaction request flow.**
   - Convert `messagesToSummarize` with Pi's exported `convertToLlm()` and
     `serializeConversation()`.
   - Wrap serialized messages in Pi's exact `<conversation>` envelope.
   - Include `<previous-summary>` for later compactions.
   - Append `Additional focus: ...` when manual custom instructions exist.
   - Use `min(0.8 * reserveTokens, model.maxTokens)` for history summaries.
   - Use the active thinking level only when the model supports reasoning.
   - Join response text blocks with newlines and preserve Pi's summarization
     error messages.

3. **Copy split-turn behavior.**
   - Summarize `messagesToSummarize` and `turnPrefixMessages` concurrently.
   - Use `min(0.5 * reserveTokens, model.maxTokens)` for the turn prefix.
   - Preserve Pi's `No prior history.` fallback.
   - Join both summaries with Pi's exact separator and
     `**Turn Context (split turn):**` heading.

4. **Copy file-operation result assembly.**
   - Build the modified set from edited and written paths.
   - Exclude modified paths from the read-only list.
   - Sort both lists.
   - Append Pi's exact `<read-files>` and `<modified-files>` footers.
   - Return `event.preparation.firstKeptEntryId` and `tokensBefore` unchanged.
   - Store `{ readFiles, modifiedFiles }` as `details`.

5. **Wire the extension event.**
   - Resolve credentials and headers with
     `ctx.modelRegistry.getApiKeyAndHeaders(ctx.model)`.
   - Pass `event.signal`, `event.customInstructions`, and
     `pi.getThinkingLevel()` through the copied flow.
   - Use Pi AI's exported `streamSimple`, matching the stock CLI path.
   - Return the copied result as `{ compaction: result }`.
   - Propagate errors so Pi's surrounding manual and automatic compaction
     lifecycle handles them.

6. **Move exact prompts into configurable files.**
   - Copy the system, initial, update, and split-turn prompts byte-for-byte from
     Pi 0.84.4.
   - Preserve trailing newlines deliberately and test the final assembled prompt
     strings.
   - Resolve `~` paths and paths relative to the configuration file.
   - Merge project prompt entries over global entries.

7. **Compare the copy with Pi's implementation.**
   - Run every deterministic fixture through Pi's exported `compact()` and the
     extension copy.
   - Assert equal system prompts, user prompts, request options, completion
     ordering, final summaries, file lists, `firstKeptEntryId`, and
     `tokensBefore`.
   - Change one prompt file and prove that only the corresponding request text
     changes.

8. **Test persisted session behavior.**
   - Run extension-enabled `AgentSession.compact()` with an in-memory or
     temporary session and deterministic provider.
   - Assert that the compacted context contains the summary followed by the same
     retained message IDs selected by Pi.
   - Cover initial, iterative, split-turn, manual-instruction, and automatic
     compaction paths.
   - Abort an in-flight completion and assert that no compaction entry is
     appended.
   - Account for generated IDs, timestamps, and `fromHook: true` when comparing
     persisted entries.

9. **Deploy and smoke-test.**
   - Stage the new files before `gob run make` so Stow links the extension and
     prompt files.
   - Start a throwaway persisted session and run `/compact`.
   - Inspect the resulting entry:

     ```bash
     jq 'select(.type == "compaction")' <session.jsonl>
     ```

   - Confirm `fromHook: true`, native-shaped `details`, the expected retained
     entry, and successful continuation after resume.
   - Edit one prompt, compact another throwaway session, and verify the changed
     instructions appear in the captured request and affect the summary.

10. **Guard Pi upgrades.**
    - Record `0.84.4` as the version whose behavior and prompts the extension
      copies.
    - Compare upstream `compaction.ts` and `utils.ts` whenever
      `nix/modules/pi.nix` changes Pi versions.
    - Update copied logic, prompt files, and parity fixtures together.
    - Refuse compaction with an actionable version-mismatch error until this
      review is complete.

## Acceptance criteria

- With the shipped prompt files, deterministic requests and results match Pi
  0.84.4 for initial, iterative, custom-instruction, and split-turn compaction.
- Manual and automatic compaction use the copied implementation.
- Pi's prepared `firstKeptEntryId` is returned unchanged, preserving recent
  context.
- File-operation footers and `details` match Pi's output.
- Authentication, headers, reasoning, cancellation, and errors retain stock CLI
  behavior.
- Prompt files can be edited without changing TypeScript or restarting Pi.
- Invalid configuration fails with an actionable error.
- A Pi version mismatch cannot silently run stale copied behavior.
- The only intentional persisted difference is `fromHook: true`.
