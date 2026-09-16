/**
 * pi-tmux — reflect this pi process's state into its own tmux window.
 *
 * Sets a pane-level option @pi_state on the agent's pane:
 *   working  — the agent is running
 *   notify   — the agent finished while its window was off-screen (a pending look)
 *   (unset)  — idle-and-seen, or not an agent
 *
 * After every change it recomputes a window-level rollup @pi_win_state
 * (working > notify > unset) that .tmux.conf renders as the tab marker. A
 * companion pane option @pi_notify_at (epoch ms) orders pending notifications
 * oldest-first for `prefix a` (dev tmux notify-switch); the navigation hooks
 * (dev tmux notify-clear) clear @pi_state=notify when a window is viewed.
 *
 * This is a display adapter. It never reads or writes pi-live's files or socket;
 * the state it puts in tmux is a parallel projection of the same lifecycle
 * events pi-live projects into its status records.
 */

import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI): void {
	const paneId = process.env.TMUX_PANE;
	if (!process.env.TMUX || !paneId) return;

	// Best-effort tmux call; a display failure must never break the agent.
	const tmux = async (args: string[]): Promise<string | undefined> => {
		try {
			const { stdout, code } = await pi.exec("tmux", args);
			return code === 0 ? stdout : undefined;
		} catch {
			return undefined;
		}
	};

	// Roll the window's panes up to the strongest state and publish it for the
	// tab marker. Runs after each change so the option reflects the pane just set.
	const recomputeRollup = async (): Promise<void> => {
		const out = await tmux(["list-panes", "-t", paneId, "-F", "#{@pi_state}"]);
		const states = (out ?? "").split("\n");
		const worst = states.includes("working")
			? "working"
			: states.includes("notify")
				? "notify"
				: undefined;
		if (worst) {
			await tmux(["set", "-w", "-t", paneId, "@pi_win_state", worst]);
		} else {
			await tmux(["set", "-wu", "-t", paneId, "@pi_win_state"]);
		}
	};

	const setWorking = async (): Promise<void> => {
		await tmux(["set", "-p", "-t", paneId, "@pi_state", "working"]);
		await tmux(["set", "-pu", "-t", paneId, "@pi_notify_at"]);
		await recomputeRollup();
	};

	const setNotify = async (): Promise<void> => {
		await tmux(["set", "-p", "-t", paneId, "@pi_state", "notify"]);
		await tmux(["set", "-p", "-t", paneId, "@pi_notify_at", String(Date.now())]);
		await recomputeRollup();
	};

	const clearState = async (): Promise<void> => {
		await tmux(["set", "-pu", "-t", paneId, "@pi_state"]);
		await tmux(["set", "-pu", "-t", paneId, "@pi_notify_at"]);
		await recomputeRollup();
	};

	// On-screen = active pane of the active window of an attached session.
	const isVisible = async (): Promise<boolean> => {
		const out = await tmux([
			"display-message",
			"-p",
			"-t",
			paneId,
			"#{&&:#{pane_active},#{&&:#{window_active},#{session_attached}}}",
		]);
		return out?.trim() === "1";
	};

	pi.on("session_start", async (_event, ctx: ExtensionContext) => {
		if (ctx.isIdle()) await clearState();
		else await setWorking();
	});

	pi.on("agent_start", async () => {
		await setWorking();
	});

	// agent_settled (not agent_end): fires after retries, compaction, and queued
	// continuations, so it is the settled signal and needs no idle debounce.
	pi.on("agent_settled", async () => {
		if (await isVisible()) await clearState();
		else await setNotify();
	});

	pi.on("session_shutdown", async () => {
		await clearState();
	});
}
