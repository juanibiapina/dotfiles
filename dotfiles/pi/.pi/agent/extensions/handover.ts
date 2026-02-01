/**
 * Handover extension - copy last assistant message to a new session
 *
 * Usage:
 *   /handover
 *
 * Copies the last assistant message text and sends it as a user message
 * in a fresh session.
 */

import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("handover", {
    description: "Copy last assistant message to a new session",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("handover requires interactive mode", "error");
        return;
      }

      // Get last assistant message from current branch
      const branch = ctx.sessionManager.getBranch();
      const lastAssistant = [...branch]
        .reverse()
        .find(
          (e): e is SessionEntry & { type: "message" } =>
            e.type === "message" && e.message.role === "assistant"
        );

      if (!lastAssistant) {
        ctx.ui.notify("No assistant message to hand over", "error");
        return;
      }

      // Extract text content
      const text = lastAssistant.message.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
        .join("\n");

      if (!text.trim()) {
        ctx.ui.notify("Last assistant message has no text content", "error");
        return;
      }

      // Create new session
      const result = await ctx.newSession({
        parentSession: ctx.sessionManager.getSessionFile(),
      });

      if (result.cancelled) {
        ctx.ui.notify("New session cancelled", "info");
        return;
      }

      // Send the text as a user message
      pi.sendUserMessage(text);
    },
  });
}
