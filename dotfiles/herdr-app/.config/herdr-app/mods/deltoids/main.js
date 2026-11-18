// ctrl-space d: deltoids over the focused session's current repo (repos.js),
// else the focused pane's folder, in a frameless dialog over the whole window.
// The dialog closes when deltoids quits.

import { View, div } from "gpui-kit";
import { agents, exec, focused, home, notify, openOverlay, closeOverlay, props, spaces, terminals } from "herdr";
import { currentDir, focusedLabels } from "./repos.js";

export default class Deltoids extends View {
  init(_props, cx) {
    const { overlay } = props() ?? {};
    cx.spawn(async () => {
      try {
        const f = focused();
        const machine = spaces().find((s) => s.id === f?.space)?.machine ?? null;
        const args = ["run", "--json", "--bg", "--no-parent", "--rm"];
        if (machine) args.push("--on", machine);
        const dir = await currentDir({ labels: focusedLabels(f, agents(), terminals()), cwd: f?.cwd, machine }, exec);
        if (dir) args.push("--cwd", dir);
        else if (!machine) args.push("--cwd", home());
        const r = await exec("hc", [...args, "--", "zsh", "-ic", "exec deltoids"]);
        let { address } = JSON.parse(r.stdout);
        if (machine && !address.includes("/")) address = `${machine}/${address}`;
        // Close this launcher first: closing it after the dialog opens hands the
        // keyboard to the dialog's frame instead of its terminal.
        if (overlay) closeOverlay(overlay);
        openOverlay({ kind: "dialog", width: 1, height: 1, frame: "none", layout: { type: "block", content: { terminal: address } } });
      } catch (e) {
        notify({ title: "Deltoids", body: String(e), level: "error" });
        if (overlay) closeOverlay(overlay);
      }
    });
  }

  render() {
    return div();
  }
}
