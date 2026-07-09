/**
 * Loop next extension - advance a pi-loop step
 *
 * Command:
 *   /next - Capture this step's result and advance the pi-loop
 *
 * Only registered when PI_LOOP_OUTPUT is set (i.e. running under the pi-loop
 * wrapper). Captures the session's last assistant message, writes it to the
 * output file the wrapper reads, and shuts pi down so the wrapper advances to
 * the next step. Absent in normal sessions.
 */

import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";
import { writeFileSync } from "node:fs";

export default function (pi: ExtensionAPI) {
	const outputPath = process.env.PI_LOOP_OUTPUT;
	if (!outputPath) return;

	pi.registerCommand("next", {
		description: "Capture this step's result and advance the pi-loop",
		handler: async (_args, ctx) => {
			await ctx.waitForIdle();

			const messages = ctx.sessionManager
				.getBranch()
				.filter((entry): entry is SessionEntry & { type: "message" } => entry.type === "message")
				.map((entry) => entry.message);

			let text = "";
			for (let i = messages.length - 1; i >= 0; i--) {
				const msg = messages[i];
				if (msg.role === "assistant") {
					text = msg.content
						.filter((c): c is { type: "text"; text: string } => c.type === "text")
						.map((c) => c.text)
						.join("\n");
					break;
				}
			}

			if (!text) {
				ctx.ui.notify("No assistant output to capture", "error");
				return;
			}

			writeFileSync(outputPath, text, "utf8");
			ctx.shutdown();
		},
	});
}
