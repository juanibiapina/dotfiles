/**
 * Session name in editor border - render the current session name as a label
 * embedded in the top border of the input editor.
 *
 * Reads the name on every render via pi.getSessionName(), so updates from
 * /title, /session-name, or any extension that calls pi.setSessionName()
 * are reflected automatically. Hidden when no name is set or when the
 * editor's scroll-up indicator is showing.
 */

import { CustomEditor, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { visibleWidth } from "@mariozechner/pi-tui";

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI) return;

		ctx.ui.setEditorComponent((tui, theme, keybindings) => {
			class SessionNameEditor extends CustomEditor {
				render(width: number): string[] {
					const lines = super.render(width);
					if (lines.length === 0) return lines;

					const name = pi.getSessionName();
					if (!name) return lines;

					// Editor reuses the top border for the scroll-up indicator;
					// don't clobber it.
					if (lines[0].includes("↑")) return lines;

					const suffix = " ──";
					const label = ` ${name} `;
					const suffixWidth = visibleWidth(suffix);
					const labelWidth = visibleWidth(label);
					if (suffixWidth + labelWidth + 1 > width) return lines;

					const lead = "─".repeat(width - suffixWidth - labelWidth);
					lines[0] = this.borderColor(lead) + label + this.borderColor(suffix);

					return lines;
				}
			}

			return new SessionNameEditor(tui, theme, keybindings);
		});
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		ctx.ui.setEditorComponent(undefined);
	});
}
