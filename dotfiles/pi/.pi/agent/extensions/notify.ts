/**
 * Add the current Pi pane to the tmux notification queue after background work.
 *
 * A pane is visible when a client views its session and both its window and
 * pane are active. Queue entries are tmux pane IDs so `prefix a` can focus the
 * exact Pi process that finished.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI): void {
	const paneId = process.env.TMUX_PANE;

	pi.on("agent_end", async () => {
		if (!process.env.TMUX || !paneId) return;

		const separator = "\u001f";
		const { stdout: locationRaw, code: locationCode } = await pi.exec("tmux", [
			"display-message",
			"-p",
			"-t",
			paneId,
			`#{session_name}${separator}#{window_active}${separator}#{pane_active}`,
		]);
		if (locationCode !== 0) return;

		const [sessionName, windowActive, paneActive] = locationRaw
			.trim()
			.split(separator);
		if (!sessionName) return;

		const { stdout: clientsRaw, code: clientsCode } = await pi.exec("tmux", [
			"list-clients",
			"-F",
			"#{client_session}",
		]);
		if (clientsCode !== 0) return;

		const viewedSessions = clientsRaw.trim().split("\n").filter(Boolean);
		const visible =
			viewedSessions.includes(sessionName) &&
			windowActive === "1" &&
			paneActive === "1";
		if (visible) return;

		const { stdout: raw } = await pi.exec("tmux", [
			"show-option",
			"-gqv",
			"@pi_notifications",
		]);
		const entries = raw.trim() ? raw.trim().split(",") : [];
		if (entries.includes(paneId)) return;

		entries.push(paneId);
		await pi.exec("tmux", [
			"set-option",
			"-g",
			"@pi_notifications",
			entries.join(","),
		]);
	});
}
