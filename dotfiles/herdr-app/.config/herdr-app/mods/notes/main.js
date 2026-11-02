// The notes space, like `dev notes` with its own tmux socket: ctrl-space o
// opens this mod, which goes to the notes space (or back to the previous
// space when already there) and closes itself. The first time, it makes the
// space in ~/Sync/notes with an editor tab and a pi tab (started by new-pi,
// like every other space's).
//
// The space's id is kept in shared("notes.space"). The spaces sidebar and
// the switch picker leave that space out; space-next/space-prev in tabs-juan
// still count it.

import { View, div } from "gpui-kit";
import { spaces, run, props, openOverlay, closeOverlay, shared, setShared, home } from "herdr";

const NAME = "notes";

export default class Notes extends View {
  init(_props, cx) {
    const { overlay } = props() ?? {};
    const done = () => { if (overlay) closeOverlay(overlay); };
    const all = spaces();
    const space = all.find((s) => s.id === shared("notes.space"))
      ?? all.find((s) => !s.machine && s.named && s.name === NAME);
    if (space) {
      if (shared("notes.space") !== space.id) setShared("notes.space", space.id);
      if (space.active) run("tabs-juan.last-space");
      else run("space.select", { id: space.id });
      return done();
    }
    const folder = `${home()}/Sync/notes`;
    const before = new Set(all.map((s) => s.id));
    run("space.new", { name: NAME, folder, tab: "editor", argv: ["nvim-server", "-c", ":NotesOpen Index", "-c", ":NoNeckPain"] });
    // spaces() shows the new space a moment after space.new.
    const started = Date.now();
    const poll = cx.timer.every(50, () => {
      const made = spaces().find((s) => !before.has(s.id));
      if (!made && Date.now() - started < 5000) return;
      poll.cancel();
      if (made) {
        setShared("notes.space", made.id);
        run("space.select", { id: made.id });
        openOverlay({ mod: "new-pi", props: { space: made.id, folder }, kind: "popup", width: 1, height: 1, frame: "none" });
      }
      done();
    });
  }

  render() {
    return div();
  }
}
