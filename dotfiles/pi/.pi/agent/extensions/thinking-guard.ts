/**
 * Thinking Guard Extension
 *
 * Monitors the thinking level and alerts the user whenever it's not set to "high" or "xhigh".
 * Shows a persistent warning in the footer and a notification on change.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	let lastNotifiedLevel: string | null = null;

	function check(ctx: ExtensionContext): void {
		const level = pi.getThinkingLevel();
		const ok = level === "high" || level === "xhigh";

		if (ok) {
			ctx.ui.setStatus("thinking-guard", undefined);
		} else {
			ctx.ui.setStatus("thinking-guard", ctx.ui.theme.fg("error", `⚠ thinking: ${level}`));
		}

		if (!ok && level !== lastNotifiedLevel) {
			ctx.ui.notify(`⚠️ Thinking level is "${level}" — not high or xhigh!`, "warning");
		}
		lastNotifiedLevel = level;
	}

	pi.on("session_start", async (_event, ctx) => check(ctx));
	pi.on("turn_start", async (_event, ctx) => check(ctx));
	pi.on("turn_end", async (_event, ctx) => check(ctx));
	pi.on("model_select", async (_event, ctx) => check(ctx));
}
