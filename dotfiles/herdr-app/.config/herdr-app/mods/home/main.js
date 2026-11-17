// The home space on this Mac, where agent sessions start: ctrl-space i opens
// this mod, which starts a pi tab (new-pi) in the space whose folder is
// ~/workspace/juanibiapina/home and goes there. When this Mac has none, it
// makes one named "home" whose first tab is pi. Like every space, it closes
// when its last pi ends (tabs-juan).

import { View, div } from "gpui-kit";
import { spaces, run, exec, home, notify, props, openOverlay, closeOverlay } from "herdr";

const NAME = "home";
const FOLDER = "workspace/juanibiapina/home"; // under the home folder

export default class Home extends View {
  init(_props, cx) {
    const { overlay } = props() ?? {};
    const done = () => { if (overlay) closeOverlay(overlay); };
    const folder = `${home()}/${FOLDER}`;
    const space = spaces().find((s) => !s.machine && s.folder === folder);
    if (space) {
      run("space.select", { id: space.id });
      openOverlay({ mod: "new-pi", props: { space: space.id, folder }, kind: "popup", width: 1, height: 1, frame: "none" });
      return done();
    }
    cx.spawn(async () => {
      const r = await exec("test", ["-d", folder]);
      if (r.code !== 0) {
        notify({ title: "No home repo", body: `Clone juanibiapina/home to ~/${FOLDER}`, level: "error" });
        return done();
      }
      // Same command as new-pi's: exec replaces Herdr's shell wrapper, so quitting pi closes the tab.
      run("space.new", { machine: "", name: NAME, folder, tab: "pi", argv: ["exec", "zsh", "-c", "exec ${CODING_AGENT:-pi}"] });
      done();
    });
  }

  render() {
    return div();
  }
}
