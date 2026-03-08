/**
 * Notify extension - tmux status bar notification on agent completion
 *
 * When a pi agent finishes in a background tmux session, adds the session
 * name to @pi_notifications so a status bar indicator appears.
 *
 * "Background" means: no tmux client is viewing the session, or the
 * window containing pi is not the active window.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.on("agent_end", async () => {
		if (!process.env.TMUX) return;

		// Get session name and whether our window is active
		const { stdout: sessionName, code: c1 } = await pi.exec("tmux", [
			"display-message", "-p", "#{session_name}",
		]);
		if (c1 !== 0 || !sessionName.trim()) return;

		const { stdout: windowActive, code: c2 } = await pi.exec("tmux", [
			"display-message", "-p", "#{window_active}",
		]);
		if (c2 !== 0) return;

		// Get all client sessions to check if anyone is viewing ours
		const { stdout: clientsRaw, code: c3 } = await pi.exec("tmux", [
			"list-clients", "-F", "#{client_session}",
		]);
		if (c3 !== 0) return;

		const session = sessionName.trim();
		const clientSessions = clientsRaw.trim().split("\n").filter(Boolean);
		const clientAttached = clientSessions.includes(session);

		// If a client is attached and our window is active, not background
		if (clientAttached && windowActive.trim() === "1") return;

		// Read current notification list
		const { stdout: raw } = await pi.exec("tmux", [
			"show-option", "-gqv", "@pi_notifications",
		]);
		const current = raw.trim();
		const list = current ? current.split(",") : [];

		// Deduplicate: skip if already present
		if (list.includes(session)) return;

		list.push(session);
		await pi.exec("tmux", [
			"set-option", "-g", "@pi_notifications", list.join(","),
		]);
	});
}
