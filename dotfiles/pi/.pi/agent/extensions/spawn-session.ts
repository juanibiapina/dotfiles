/**
 * Spawn session extension - tool to open a new pi session in a tmux split
 *
 * Reproduces the `prefix+i` keybinding (split-window -h then run $CODING_AGENT)
 * and seeds the new session with an initial prompt that pi submits on startup.
 *
 * The prompt is passed as a pane environment variable (split-window -e) rather
 * than interpolated into the shell-command, so prompts with quotes, spaces, and
 * other special characters need no escaping. Only the trusted agent binary name
 * ($CODING_AGENT, defaulting to "pi") is interpolated. `exec` replaces the pane
 * shell so the pane closes when the spawned session exits.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
	let cwd = process.cwd();

	pi.on("session_start", (_event, ctx) => {
		cwd = ctx.cwd;
	});

	pi.registerTool({
		name: "spawn_pi_session",
		description:
			"Start a new pi session in the current directory with an initial prompt. Splits the tmux window horizontally and opens a fresh, independent pi session that submits the prompt on startup. Use to delegate a parallel task to a sibling session.",
		parameters: Type.Object({
			prompt: Type.String({
				description: "Initial prompt submitted as the first message of the new session.",
			}),
		}),
		async execute(_toolCallId, params) {
			const { prompt } = params as { prompt: string };
			const trimmed = prompt.trim();

			if (!trimmed) {
				throw new Error("Prompt must not be empty");
			}

			if (!process.env.TMUX) {
				return { content: [{ type: "text", text: "Not running inside tmux; cannot spawn a session." }] };
			}

			const agent = process.env.CODING_AGENT || "pi";

			const { code, stderr } = await pi.exec("tmux", [
				"split-window",
				"-h",
				"-c",
				cwd,
				"-e",
				`PI_INITIAL_PROMPT=${trimmed}`,
				`exec ${agent} "$PI_INITIAL_PROMPT"`,
			]);

			if (code !== 0) {
				throw new Error(`tmux split-window failed: ${stderr.trim() || `exit code ${code}`}`);
			}

			return { content: [{ type: "text", text: `Spawned new ${agent} session in ${cwd}` }] };
		},
	});
}
