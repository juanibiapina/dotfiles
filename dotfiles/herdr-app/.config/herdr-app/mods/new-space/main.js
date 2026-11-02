// A new space with the default tabs, like tmux's default_windows:
// 1 "nvim" (nvim-server), 2 "deltoids", 3 "gob" (gob tui; quitting any of
// these leaves a shell), 4 "pi" (started by new-pi, so quitting pi closes the tab). cmd-n and the
// projects picker open this mod, with props {folder?, machine?}; it makes
// the space and closes itself. run() returns before the command lands, so the
// tabs go through `herdr-app do`, which returns once each one exists.

import { View, div } from "gpui-kit";
import { exec, props, openOverlay, closeOverlay, notify } from "herdr";

async function herdr(command, args) {
  const r = await exec("herdr-app", ["do", command, JSON.stringify(args)]);
  if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim());
  return JSON.parse(r.stdout);
}

export default class NewSpace extends View {
  init(_props, cx) {
    const { folder, machine, overlay } = props() ?? {};
    const at = folder ? { folder } : {};
    cx.spawn(async () => {
      try {
        const { space } = await herdr("space.new", { ...at, ...(machine ? { machine } : {}), tab: "nvim", argv: ["nvim-server"] });
        await herdr("tab.new", { space, ...at, name: "deltoids", argv: ["deltoids"] });
        await herdr("tab.new", { space, ...at, name: "gob", argv: ["gob", "tui"] });
        openOverlay({ mod: "new-pi", props: { space, ...at }, kind: "popup", width: 1, height: 1, frame: "none" });
      } catch (e) {
        notify({ title: "New space failed", body: String(e.message ?? e), level: "error" });
      }
      if (overlay) closeOverlay(overlay);
    });
  }

  render() {
    return div();
  }
}
