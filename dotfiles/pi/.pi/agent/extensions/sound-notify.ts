/**
 * Sound notification extension - play a sound when the agent finishes
 *
 * Off by default. Toggle with /sound.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const SOUND = "/System/Library/Sounds/Glass.aiff";

export default function (pi: ExtensionAPI) {
	let enabled = false;

	pi.registerCommand("sound", {
		description: "Toggle sound notification on agent completion",
		handler: async (_args, ctx) => {
			enabled = !enabled;
			ctx.ui.notify(`Sound notifications ${enabled ? "enabled" : "disabled"}`, "info");
		},
	});

	pi.on("agent_end", async () => {
		if (!enabled) return;
		pi.exec("afplay", [SOUND]);
	});
}
