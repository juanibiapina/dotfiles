/**
 * Custom Compaction Extension
 *
 * Delegates to Pi's exported compact() so the summarization prompt and the kept
 * conversation (firstKeptEntryId, split-turn merge, file footers) match Pi's
 * default compaction exactly.
 *
 * Two additions ride in Pi's `Additional focus` slot via customInstructions:
 * - Workflows: standing directives on how work must be carried out.
 * - Skills to reload: active skills with their SKILL.md locations and an
 *   imperative to re-read them, so skill-driven behavior is restored.
 *
 * Known differences from stock: no private streamFn (falls back to
 * completeSimple, so provider-attribution headers and before_provider hooks are
 * not applied), no retry policy, and Pi marks the entry fromHook: true.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { compact } from "@earendil-works/pi-coding-agent";

// Our additions to Pi's compaction prompt, injected via `Additional focus`.
const ADDITIONS = `Also add two more sections to the summary:

Workflows: standing directives the user gave about HOW work must be carried out — procedures, sequencing, conventions, and habits the agent must keep following. Merge in any Workflows already present in the previous summary.

Skills to reload: skills active in this session, so their behavior can be restored after this summary replaces the conversation. Identify them from the conversation, including any <skill name="..." location="..."> blocks, and list each by name with its SKILL.md location. Lead this section with an imperative to the agent that will read this summary: immediately re-read the listed SKILL.md files to restore their behavior before continuing. Merge in any skills listed in the previous summary's Skills to reload section.

Omit either added section when there is nothing real to put in it — never emit empty or placeholder sections.`;

export default function (pi: ExtensionAPI) {
	pi.on("session_before_compact", async (event, ctx) => {
		ctx.ui.notify("Custom compaction extension triggered", "info");

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
