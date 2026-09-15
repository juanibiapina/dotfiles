/**
 * Spawn session extension - tool to open a new pi session in a tmux window
 *
 * Reproduces the `prefix+i` keybinding (new-window then run $CODING_AGENT) and
 * seeds the new session with an initial prompt that pi submits on startup.
 *
 * The prompt is passed as a pane environment variable (new-window -e) rather
 * than interpolated into the shell command, so prompts need no escaping. Tmux
 * starts the default interactive shell before send-keys runs the agent command,
 * matching `prefix+i`. `exec` closes the window when the agent exits.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "spawn_pi_session",
		description:
			"Start a new pi session in the current directory with an initial prompt. Opens a new tmux window (tab) with a fresh, independent pi session that submits the prompt on startup. Use to delegate a parallel task to a sibling session.",
		parameters: Type.Object({
			prompt: Type.String({
				description:
					"Initial prompt submitted as the first message of the new session.",
			}),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const { prompt } = params as { prompt: string };
			const trimmed = prompt.trim();

			if (!trimmed) {
				throw new Error("Prompt must not be empty");
			}

			if (!process.env.TMUX) {
				return {
					content: [
						{
							type: "text",
							text: "Not running inside tmux; cannot spawn a session.",
						},
					],
				};
			}

			const { code, stderr } = await pi.exec("tmux", [
				"new-window",
				"-n",
				"pi",
				"-c",
				ctx.cwd,
				"-e",
				`PI_INITIAL_PROMPT=${trimmed}`,
				";",
				"send-keys",
				'exec $CODING_AGENT "$PI_INITIAL_PROMPT"',
				"Enter",
			]);

			if (code !== 0) {
				throw new Error(
					`tmux new-window failed: ${stderr.trim() || `exit code ${code}`}`,
				);
			}

			return {
				content: [
					{ type: "text", text: `Spawned new Pi session in ${ctx.cwd}` },
				],
			};
		},
	});
}
