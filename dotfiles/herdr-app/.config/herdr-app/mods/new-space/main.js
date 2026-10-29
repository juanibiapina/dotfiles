// A new space with the default tabs, like tmux's default_windows:
// 1 "deltoids" (quitting it leaves a shell), 2 "pi" (started by new-pi, so
// quitting pi closes the tab). cmd-n and the projects picker open this mod,
// with props {folder?, machine?}; it makes the space and closes itself.
// spaces() shows the new space a moment after space.new, so it waits for it
// (up to 5 s) before asking new-pi for the second tab.

import { View, div } from "gpui-kit";
import { spaces, run, props, openOverlay, closeOverlay } from "herdr";

export default class NewSpace extends View {
  init(_props, cx) {
    const { folder, machine, overlay } = props() ?? {};
    const before = new Set(spaces().map((s) => s.id));
    run("space.new", { ...(folder ? { folder } : {}), ...(machine ? { machine } : {}), tab: "deltoids", argv: ["deltoids"] });
    const started = Date.now();
    const poll = cx.timer.every(50, () => {
      const space = spaces().find((s) => !before.has(s.id));
      if (!space && Date.now() - started < 5000) return;
      poll.cancel();
      if (space) {
        openOverlay({
          mod: "new-pi",
          props: { space: space.id, ...(space.folder ? { folder: space.folder } : {}) },
          kind: "popup", width: 1, height: 1, frame: "none",
        });
      }
      if (overlay) closeOverlay(overlay);
    });
  }

  render() {
    return div();
  }
}
