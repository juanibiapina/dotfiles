/**
 * Custom Compaction Extension
 *
 * Delegates to Pi's exported compact() so the summarization prompt and the kept
 * conversation (firstKeptEntryId, split-turn merge, file footers) match Pi's
 * default compaction exactly.
 *
 * Three additions ride in Pi's `Additional focus` slot via customInstructions:
 * - Workflows: standing directives on how work must be carried out.
 * - Skills to reload: relevant skill names and an imperative to re-read them.
 * - Plan to reload: the active plan reference and an imperative to re-read it.
 *
 * Known differences from stock: no private streamFn (falls back to
 * completeSimple, so provider-attribution headers and before_provider hooks are
 * not applied), no retry policy, and Pi marks the entry fromHook: true.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { compact } from "@earendil-works/pi-coding-agent";

// Our additions to Pi's compaction prompt, injected via `Additional focus`.
const ADDITIONS = `Also add three more sections to the summary:

Workflows: standing directives the user gave about HOW work must be carried out — procedures, sequencing, conventions, and habits the agent must keep following. Merge in any Workflows already present in the previous summary.

Skills to reload: skills relevant to continuing this work, so their behavior can be restored after this summary replaces the conversation. Identify them from the conversation, including any <skill name="..." location="..."> blocks, but in this section list only each skill name and no SKILL.md path. Lead this section with an imperative to the agent that will read this summary: before continuing, you MUST find and re-read every listed skill. Merge in skills from the previous summary's Skills to reload section only while they remain relevant.

Plan to reload: when the session is following a written plan, include its exact durable reference and the current checkpoint when known. Lead this section with an imperative to the agent that will read this summary: before continuing, you MUST re-read the referenced plan. Merge in the previous summary's plan reference only while that plan remains active. Do not invent a plan reference.

Omit any added section when there is nothing real to put in it — never emit empty or placeholder sections.`;

export default function (pi: ExtensionAPI) {
	pi.on("session_before_compact", async (event, ctx) => {
		ctx.ui.notify("Compacting conversation context…", "info");

		const { preparation, signal } = event;

		// Use the current session model for summarization.
		const model = ctx.model;
		if (!model) {
			ctx.ui.notify(`No current model available, using default compaction`, "warning");
			return;
		}

		// Resolve credentials for the summarization request.
		const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
		if (!auth.ok) {
			ctx.ui.notify(`Could not resolve credentials (${auth.error}), using default compaction`, "warning");
			return;
		}

		// Overlay the resolved baseUrl onto the model, matching stock Pi's
		// _getSummarizationRequestAuth.
		const requestModel = auth.baseUrl ? { ...model, baseUrl: auth.baseUrl } : model;

		// Merge the user's `/compact <focus>` (if any) with our additions so both
		// land in Pi's `Additional focus` slot.
		const customInstructions = [event.customInstructions, ADDITIONS].filter(Boolean).join("\n\n");

		try {
			// Delegate to Pi's own compaction so the prompt and kept conversation
			// match stock exactly.
			const result = await compact(
				preparation,
				requestModel,
				auth.apiKey,
				auth.headers,
				customInstructions,
				signal,
				pi.getThinkingLevel(),
				undefined, // streamFn: not exposed to hooks; falls back to completeSimple
				auth.env,
				undefined, // retry: no settings accessor in the hook
				undefined, // callbacks
				undefined, // sessionId: undefined matches stock (fresh routing id)
			);
			return { compaction: result };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (!signal.aborted) ctx.ui.notify(`Compaction failed: ${message}`, "error");
			// Fall back to default compaction on error.
			return;
		}
	});
}
