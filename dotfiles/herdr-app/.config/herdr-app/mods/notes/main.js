// The notes space on mini, like `dev notes` with its own tmux socket:
// ctrl-space o opens this mod, which goes to the space named "notes" on mini
// (or back to the previous space when already there) and closes itself. When
// mini has no notes space, it makes one in ~/Sync/notes there with an editor
// tab and a pi tab (started by new-pi, like every other space's). The phone's
// Notes tab lists the same space.
//
// workbench and tabs-juan hide it unless it is active; the session picker lists it.

import { View, div } from "gpui-kit";
import { spaces, run, exec, notify, props, openOverlay, closeOverlay } from "herdr";

const MACHINE = "mini";
const NAME = "notes";
const FOLDER = "Sync/notes"; // under the home on MACHINE

export default class Notes extends View {
  init(_props, cx) {
    const { overlay } = props() ?? {};
    const done = () => { if (overlay) closeOverlay(overlay); };
    const space = spaces().find((s) => s.machine === MACHINE && s.named && s.name === NAME);
    if (space) {
      if (space.active) run("tabs-juan.last-space");
      else run("space.select", { id: space.id });
      return done();
    }
    cx.spawn(async (cx) => {
      let folder;
      const before = new Set(spaces().map((s) => s.id));
      try {
        const r = await exec("sh", ["-c", 'cd "$HOME/$1" && pwd', "sh", FOLDER], { on: MACHINE });
        if (r.code !== 0) throw new Error(r.stderr.trim() || `no ~/${FOLDER} on ${MACHINE}`);
        folder = r.stdout.trim();
        await run("space.new", { machine: MACHINE, name: NAME, folder, tab: "editor", argv: ["nvim-server", "-c", ":NotesOpen Index", "-c", ":NoNeckPain"] });
      } catch (e) {
        notify({ title: "Could not open notes", body: e.message, level: "error" });
        return done();
      }
      // spaces() shows the new space a moment after space.new.
      const started = Date.now();
      const poll = cx.timer.every(50, () => {
        const made = spaces().find((s) => !before.has(s.id) && s.machine === MACHINE);
        if (!made && Date.now() - started < 5000) return;
        poll.cancel();
        if (made) {
          run("space.select", { id: made.id });
          openOverlay({ mod: "new-pi", props: { space: made.id, folder }, kind: "popup", width: 1, height: 1, frame: "none" });
        }
        done();
      });
    });
  }

  render() {
    return div();
  }
}
