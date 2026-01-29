/**
 * Auto-exit extension - exits pi after the agent completes a loop turn.
 *
 * Use this when you want pi to run a single turn and then automatically exit.
 * Enable with the --auto-exit flag:
 *
 *   pi --auto-exit
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerFlag("auto-exit", {
    description: "Exit after the agent completes a turn",
    type: "boolean",
    default: false,
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (!pi.getFlag("--auto-exit")) {
      return;
    }

    ctx.shutdown();
  });
}
