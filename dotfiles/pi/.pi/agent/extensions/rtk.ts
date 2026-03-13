/**
 * RTK extension - rewrite bash commands via rtk before execution
 *
 * Uses createBashTool with a spawnHook to intercept bash commands and
 * rewrite them through `rtk rewrite`. If rtk is not installed, the
 * extension does nothing.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createBashTool } from "@mariozechner/pi-coding-agent";
import { spawnSync } from "node:child_process";

export default function (pi: ExtensionAPI) {
	// Guard: skip if rtk is not available
	const which = spawnSync("which", ["rtk"]);
	if (which.status !== 0) return;

	const cwd = process.cwd();

	const bashTool = createBashTool(cwd, {
		spawnHook: ({ command, cwd, env }) => {
			const result = spawnSync("rtk", ["rewrite", command], {
				encoding: "utf-8",
				timeout: 5000,
			});

			const rewritten =
				result.status === 0 && result.stdout.trim()
					? result.stdout.trim()
					: command;

			return { command: rewritten, cwd, env };
		},
	});

	pi.registerTool(bashTool);
}
