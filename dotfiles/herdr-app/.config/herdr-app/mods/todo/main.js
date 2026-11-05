import { View, div } from "gpui-kit";
import { exec, focused, home, notify, openOverlay, closeOverlay, props, spaces } from "herdr";

export default class Todo extends View {
  init(_props, cx) {
    const { overlay } = props() ?? {};
    cx.spawn(async () => {
      try {
        const f = focused();
        const machine = spaces().find((s) => s.id === f?.space)?.machine ?? null;
        const args = ["run", "--json", "--bg", "--no-parent", "--rm"];
        if (machine) args.push("--on", machine);
        if (f?.cwd) args.push("--cwd", f.cwd);
        else if (!machine) args.push("--cwd", home());
        const r = await exec("hc", [...args, "--", "todo", "tui"]);
        let { address } = JSON.parse(r.stdout);
        if (machine && !address.includes("/")) address = `${machine}/${address}`;
        // Close this launcher first: closing it after the dialog opens hands the
        // keyboard to the dialog's frame instead of its terminal.
        if (overlay) closeOverlay(overlay);
        openOverlay({ kind: "dialog", width: 0.8, height: 0.8, layout: { type: "block", content: { terminal: address } } });
      } catch (e) {
        notify({ title: "Todo", body: String(e), level: "error" });
        if (overlay) closeOverlay(overlay);
      }
    });
  }

  render() {
    return div();
  }
}
