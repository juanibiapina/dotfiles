/**
 * Stash extension - pair git stash with pi session management
 *
 * Commands:
 *   /stash [message] - Stash code changes, save session reference, start new session
 *   /pop             - Restore most recent pi stash (code + session)
 *
 * The session file path is encoded in the git stash message, making it
 * self-contained with no external state files.
 *
 * Usage:
 *   /stash
 *   /stash my feature work
 *   /pop
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const STASH_PREFIX = "pi-stash:";

export default function (pi: ExtensionAPI) {
	async function isGitRepo(): Promise<boolean> {
		const { code } = await pi.exec("git", ["rev-parse", "--git-dir"]);
		return code === 0;
	}

	async function hasChanges(): Promise<boolean> {
		const { stdout, code } = await pi.exec("git", ["status", "--porcelain"]);
		return code === 0 && stdout.trim().length > 0;
	}

	interface PiStashEntry {
		index: number;
		sessionPath: string;
		description: string;
	}

	async function findLatestPiStash(): Promise<PiStashEntry | null> {
		const { stdout, code } = await pi.exec("git", ["stash", "list", "--format=%gd|||%s"]);
		if (code !== 0 || !stdout.trim()) return null;

		for (const line of stdout.trim().split("\n")) {
			const sepIndex = line.indexOf("|||");
			if (sepIndex === -1) continue;

			const ref = line.substring(0, sepIndex); // stash@{N}
			const subject = line.substring(sepIndex + 3); // "On branch: pi-stash:..."

			const prefixIndex = subject.indexOf(STASH_PREFIX);
			if (prefixIndex === -1) continue;

			const afterPrefix = subject.substring(prefixIndex + STASH_PREFIX.length);
			// Session path ends at first space (description follows) or end of string
			const spaceIndex = afterPrefix.indexOf(" ");
			const sessionPath = spaceIndex === -1 ? afterPrefix : afterPrefix.substring(0, spaceIndex);
			const description = spaceIndex === -1 ? "" : afterPrefix.substring(spaceIndex + 1);

			// Extract index from stash@{N}
			const match = ref.match(/stash@\{(\d+)\}/);
			if (!match) continue;

			return {
				index: parseInt(match[1], 10),
				sessionPath,
				description,
			};
		}

		return null;
	}

	// /stash [message] - stash code changes + save session, start new session
	pi.registerCommand("stash", {
		description: "Stash code changes and save session",
		handler: async (args, ctx) => {
			if (!await isGitRepo()) {
				ctx.ui.notify("Not a git repository", "error");
				return;
			}

			if (!await hasChanges()) {
				ctx.ui.notify("No changes to stash", "error");
				return;
			}

			const sessionFile = ctx.sessionManager.getSessionFile();
			if (!sessionFile) {
				ctx.ui.notify("Cannot stash an ephemeral session", "error");
				return;
			}

			// Build stash message: pi-stash:<session-path> [user description]
			const userMessage = args.trim();
			let stashMessage = `${STASH_PREFIX}${sessionFile}`;
			if (userMessage) {
				stashMessage += ` ${userMessage}`;
			}

			// Stash code changes (include untracked files)
			const { code, stderr } = await pi.exec("git", ["stash", "push", "-u", "-m", stashMessage]);
			if (code !== 0) {
				ctx.ui.notify(`Git stash failed: ${stderr.trim()}`, "error");
				return;
			}

			// Start a new session
			const result = await ctx.newSession();
			if (result.cancelled) {
				// New session was cancelled — pop the stash back to avoid losing work
				await pi.exec("git", ["stash", "pop"]);
				ctx.ui.notify("Cancelled — stash restored", "info");
				return;
			}

			const label = userMessage ? `Stashed: ${userMessage}` : "Stashed";
			ctx.ui.notify(label, "info");
		},
	});

	// /pop - restore most recent pi stash (code + session)
	pi.registerCommand("pop", {
		description: "Restore most recent stashed code and session",
		handler: async (_args, ctx) => {
			if (!await isGitRepo()) {
				ctx.ui.notify("Not a git repository", "error");
				return;
			}

			const entry = await findLatestPiStash();
			if (!entry) {
				ctx.ui.notify("No pi stash entries found", "error");
				return;
			}

			// Pop the git stash
			const { code, stderr } = await pi.exec("git", ["stash", "pop", `stash@{${entry.index}}`]);
			if (code !== 0) {
				ctx.ui.notify(`Git stash pop failed: ${stderr.trim()}`, "error");
				return;
			}

			// Switch to the saved session
			const { existsSync } = await import("node:fs");
			if (!existsSync(entry.sessionPath)) {
				ctx.ui.notify("Code restored, but saved session no longer exists", "warning");
				return;
			}

			const result = await ctx.switchSession(entry.sessionPath);
			if (result.cancelled) {
				ctx.ui.notify("Code restored, but session switch was cancelled", "warning");
				return;
			}

			const label = entry.description ? `Restored: ${entry.description}` : "Restored";
			ctx.ui.notify(label, "info");
		},
	});
}
