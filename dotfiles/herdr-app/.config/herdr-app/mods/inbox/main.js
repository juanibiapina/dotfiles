import { View, div } from "gpui-kit";
import { exec, home, notify, openOverlay, closeOverlay, props } from "herdr";

export default class Inbox extends View {
  init(_props, cx) {
    const { overlay } = props() ?? {};
    cx.spawn(async () => {
      try {
        const r = await exec("hc", ["run", "--json", "--bg", "--no-parent", "--rm", "--cwd", home(), "--", "ghtui"]);
        const { address } = JSON.parse(r.stdout);
        // Close this launcher first: closing it after the dialog opens hands the
        // keyboard to the dialog's frame instead of its terminal.
        if (overlay) closeOverlay(overlay);
        openOverlay({ kind: "dialog", width: 0.9, height: 0.9, layout: { type: "block", content: { terminal: address } } });
      } catch (e) {
        notify({ title: "GitHub inbox", body: String(e), level: "error" });
        if (overlay) closeOverlay(overlay);
      }
    });
  }

  render() {
    return div();
  }
}
