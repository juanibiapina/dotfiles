// A new space with the default tabs, like tmux's default_windows:
// 1 "nvim" (nvim-server), 2 "deltoids" (quitting either leaves a shell),
// 3 "pi" (started by new-pi, so quitting pi closes the tab). cmd-n and the
// projects picker open this mod, with props {folder?, machine?}; it makes
// the space and closes itself. spaces() shows the new space a moment after
// space.new, so it waits for it (up to 5 s) before adding the other tabs.

import { View, div } from "gpui-kit";
import { spaces, run, props, openOverlay, closeOverlay } from "herdr";

export default class NewSpace extends View {
  init(_props, cx) {
    const { folder, machine, overlay } = props() ?? {};
    const before = new Set(spaces().map((s) => s.id));
    run("space.new", { ...(folder ? { folder } : {}), ...(machine ? { machine } : {}), tab: "nvim", argv: ["nvim-server"] });
    const started = Date.now();
    const poll = cx.timer.every(50, () => {
      const space = spaces().find((s) => !before.has(s.id));
      if (!space && Date.now() - started < 5000) return;
      poll.cancel();
      if (space) {
        const where = { space: space.id, ...(space.folder ? { folder: space.folder } : {}) };
        run("tab.new", { ...where, name: "deltoids", argv: ["deltoids"] });
        openOverlay({ mod: "new-pi", props: where, kind: "popup", width: 1, height: 1, frame: "none" });
      }
      if (overlay) closeOverlay(overlay);
    });
  }

  render() {
    return div();
  }
}
