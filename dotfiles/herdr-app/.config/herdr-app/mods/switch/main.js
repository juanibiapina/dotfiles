// Session switcher, like `prefix s` in tmux: every session grouped by space,
// as the workbench sidebar lists them, with the same picker the mail and
// GitHub inboxes send threads with. It opens on the focused session.
// j/k move, / searches, ↵ goes there (waking a snoozed session first), Esc
// leaves the search, then the switcher.

import { View } from "gpui-kit";
import { ScrollHandle } from "gpui-base";
import { exec, focused, run, theme, props, closeOverlay } from "herdr";
import { pickerRows, settle, move, renderPicker, PickerSearch, pickerKey } from "./session-picker.js";

export default class Switch extends View {
  init(_props, cx) {
    const here = focused()?.agent;
    const rows = pickerRows();
    const i = rows.findIndex((r) => r.kind === "session" && r.agent.address === here);
    this.at = i >= 0 ? i : settle(rows);
    this.scroll = ScrollHandle.new();
    this.scroll.scroll_to_item(Math.max(0, this.at));
    this.handle = cx.focus_handle();
    this.search = new PickerSearch(this.handle, {
      onChange: (_e, cx) => { this.at = -1; cx.notify(); },
      onSubmit: () => this.go(this.rows()[this.at]),
    });
    cx.timer.after(0, () => this.handle.focus());
  }

  rows() {
    const rows = pickerRows([], this.search.value());
    if (this.at < 0 || !rows[this.at]) {
      this.at = settle(rows);
      this.scroll.scroll_to_item(Math.max(0, this.at));
    }
    return rows;
  }

  close() {
    closeOverlay(props().overlay);
  }

  go(row) {
    if (row?.kind !== "session") return;
    this.close();
    const a = row.agent;
    if (!row.snoozed) return run("pane.focus", { pane: a.pane });
    exec("dev", ["herdr", "wake", a.address.split("/").pop()], { on: row.machine })
      .catch(() => {})
      .then(() => run("pane.focus", { pane: a.pane }));
  }

  render() {
    const t = theme();
    const rows = this.rows();
    return renderPicker(t, rows, this.at, {
      title: "Switch session",
      footer: this.search.active ? "↑↓ or ⌃j/⌃k choose · ↵ go · Esc stop searching" : "j/k choose · / search · ↵ go · Esc leave",
      scroll: this.scroll,
      search: this.search,
      onPick: (i) => this.go(rows[i]),
    })
      .id("switch")
      .track_focus(this.handle)
      .size_full()
      .p(16)
      .bg(t.popover)
      // Escape is Herdr's overlay.close binding, which runs before key
      // handlers: while searching it leaves the search instead.
      .when(this.search.active, (el) => el.on_action("overlay.close", (_e, cx) => {
        this.search.stop();
        cx.stop_propagation();
        cx.notify();
      }))
      .on_key_down((e, cx) => {
        const k = e.modifiers.control ? `ctrl-${e.key}`
          : ["down", "up", "enter", "escape"].includes(e.key) ? e.key : e.key_char || e.key;
        if (k === "escape" && !this.search.stop()) return this.close();
        const act = pickerKey(this.search, k);
        if (act.search) this.search.start();
        else if (act.pick) this.go(rows[this.at]);
        else if (act.move) {
          this.at = move(rows, this.at, act.move);
          this.scroll.scroll_to_item(this.at);
        } else return;
        cx.stop_propagation();
        cx.notify();
      });
  }
}
