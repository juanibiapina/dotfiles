/**
 * Close session extension - tool to close the tmux session where pi is running
 *
 * Captures the session ID at startup via the pane ID, ensuring we always
 * close the correct session even if the user switches to another or the
 * session is in the background.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
	// Capture session ID via pane ID - works even if session is in background
	let sessionId: string | null = null;
	const paneId = process.env.TMUX_PANE;

	if (process.env.TMUX && paneId) {
		pi.exec("tmux", ["display-message", "-p", "-t", paneId, "#{session_id}"]).then(({ stdout, code }) => {
			if (code === 0 && stdout.trim()) {
				sessionId = stdout.trim();
			}
		});
	}

	pi.registerTool({
		name: "close_tmux_session",
		description: "Close the tmux session where this agent is running. Use when the user is done and wants to close the session.",
		parameters: Type.Object({}),
		async execute() {
			if (!sessionId) {
				return { content: [{ type: "text", text: "Not running inside tmux or session ID unknown" }] };
			}
			pi.exec("tmux", ["kill-session", "-t", sessionId]);
			return { content: [{ type: "text", text: `Closing tmux session ${sessionId}...` }] };
		},
	});
}
