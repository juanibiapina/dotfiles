import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const reminder = "This session has no name yet. Call set_session_name with a 2-5 word title for the session's goal in your first tool batch.";

export default function (pi: ExtensionAPI): void {
  pi.registerCommand("title", {
    description: "Set the session name (usage: /title <name>)",
    handler: async (args, ctx) => {
      const name = args.trim();
      if (!name) {
        ctx.ui.notify("Usage: /title <name>", "error");
        return;
      }
      pi.setSessionName(name);
      ctx.ui.notify(`Session named: ${name}`, "info");
    },
  });
  pi.on("before_agent_start", () => {
    if (pi.getSessionName()) return;
    return { message: { customType: "session-name-reminder", content: reminder, display: false } };
  });
  pi.registerTool({
    name: "set_session_name", label: "Set Session Name",
    description: "Set a short title for the current session's overall goal. Call this once per session, in your first tool batch. Keep the title through later steps, including commits and pushes. Pick a concise 2-5 word title.",
    promptSnippet: "Name the session's overall goal once",
    promptGuidelines: ["Call set_session_name once per session, in your first tool batch; keep that title for the session."],
    parameters: Type.Object({
      name: Type.String({ description: "Concise 2-5 word title for the session's overall goal. No quotes, no punctuation." }),
    }),
    async execute(_id, { name }) {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Session name must not be empty");
      pi.setSessionName(trimmed);
      return { content: [{ type: "text", text: `Session named: ${trimmed}` }], details: { name: trimmed } };
    },
  });
}
