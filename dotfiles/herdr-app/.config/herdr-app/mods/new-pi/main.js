// Like tmux's prefix-i: a new tab named "pi" running $CODING_AGENT.
// Key actions can't pass argv, so ctrl-space i opens this mod, which
// starts the tab and closes itself. new-space opens it with props
// {space, folder} to start pi in a space it just made. Without props it starts
// in the active space's folder, like a tmux session's directory. A `task` prop
// becomes pi's first message, and a `label` prop (`key=value`) goes on pi's
// terminal before pi starts: the inbox links a GitHub thread to the session
// this way (see mods/inbox/routing.js, whose startArgv does the same).
//
// Herdr runs argv as `zsh -ic '"$@"; exec "$0" -i' zsh <argv>`, which drops
// into a shell when the program ends. Starting argv with `exec` replaces that
// wrapper, so exiting pi (ctrl+d) closes the tab, as in tmux.

import { View, div } from "gpui-kit";
import { run, props, spaces, closeOverlay } from "herdr";

export default class NewPi extends View {
  init() {
    const { space, task, label, overlay } = props() ?? {};
    const folder = props()?.folder || spaces().find((s) => (space ? s.id === space : s.active))?.folder;
    run("tab.new", {
      name: "pi",
      argv: ["exec", "zsh", "-c",
        'h=$(command -v hc || echo "$HOME/.local/bin/hc"); [ -n "$1" ] && [ -n "$HC_TERMINAL_ID" ] && "$h" label "$HC_TERMINAL_ID" "$1" >/dev/null 2>&1; shift; exec ${CODING_AGENT:-pi} "$@"',
        "zsh", label ?? "", ...(task ? [task] : [])],
      ...(space ? { space } : {}),
      ...(folder ? { folder } : {}),
    });
    if (overlay) closeOverlay(overlay);
  }

  render() {
    return div();
  }
}
