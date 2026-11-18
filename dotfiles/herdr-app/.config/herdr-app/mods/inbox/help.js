// The search on a dialog's help sheet. While the sheet shows, / opens a box
// that narrows the keys to those whose keys, label or group contain every
// word typed; ↵ leaves the box with the matches shown, and Escape clears the
// search (the sheet's own Escape closes it once nothing is searched). Any
// other key still closes the sheet. The sheet takes every key while it
// shows, so this / never meets the dialog's own / (filter, find or the
// session picker's search).
//
// The host owns a HelpSearch, calls reset() when the sheet opens, asks key()
// what a key does, calls stop() on Escape, and draws box() under its title.
// A mod can only import files inside its own folder, so
// scripts/link-dotfiles.bash copies this file into the mail, linear, zero and
// slack mods.

import { div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";

export class HelpSearch {
  // handle is the host's focus handle, which gets the keyboard back.
  constructor(handle) {
    this.handle = handle;
    this.active = false;
    this.input = InputState.new({ placeholder: "Search keys…" });
    this.input.on("change", (_e, cx) => cx.notify());
    this.input.on("submit", (_e, cx) => {
      this.active = false;
      this.handle.focus();
      cx.notify();
    });
  }

  query() { return this.input.value().trim(); }

  // A fresh sheet: no search, the dialog has the keyboard.
  reset() {
    this.active = false;
    this.input.set_value("");
    this.handle.focus();
  }

  // What a key does while the sheet shows: "type" while the box has the
  // keyboard (the box takes it), "search" to open the box, else "close".
  key(k) {
    if (this.active) return "type";
    return k === "/" ? "search" : "close";
  }

  start() {
    this.active = true;
    this.input.focus();
  }

  // Clears and leaves the search. False when there was none.
  stop() {
    if (!this.active && !this.query()) return false;
    this.reset();
    return true;
  }

  // The keys that match the search. text gives what a key is searched by
  // when its row shows more than its label.
  filter(keys, text = (k) => k.label) {
    const words = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return keys;
    return keys.filter((k) => {
      const hay = [...k.keys, text(k), k.group].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }

  // The search box and, when nothing matches, a line saying so; null while
  // nothing is searched. matches is how many keys filter() kept.
  box(t, matches) {
    if (!this.active && !this.query()) return null;
    const none = this.query() && !matches;
    return v_flex().flex_none().gap(8)
      .child(h_flex().h(32).flex_none().px(10).rounded(8).border_1().border_color(this.active ? t.accent : t.border).bg(t.background).items_center()
        .child(Input.new(this.input).flex_1().h_full().text_size(12.5).text_color(t.foreground)))
      .when(Boolean(none), (el) => el.child(div().text_size(12).text_color(t.dim).child(`No key matches “${this.query()}”`)));
  }
}
