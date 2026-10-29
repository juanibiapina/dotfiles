import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { closeOverlay, commands, focused, hc, nextCommand, props, run, theme } from "herdr";

const BINDINGS = [
  ["c", "tab.new", "New tab"],
  ["n", "tab.next", "Next tab"],
  ["p", "tab.prev", "Previous tab"],
  [",", "tab.rename", "Rename tab"],
  ["&", "tab.close", "Close tab"],
  ["%", "pane.split:right", "Split right"],
  ["\"", "pane.split:down", "Split down"],
  ["v", "pane.split:right", "Split right"],
  ["V", "pane.split:down", "Split down"],
  ["x", "pane.close", "Close pane"],
  ["z", "pane.zoom", "Zoom pane"],
  ["h", "pane.go:left", "Pane left"],
  ["j", "pane.go:down", "Pane down"],
  ["k", "pane.go:up", "Pane up"],
  ["l", "pane.go:right", "Pane right"],
  ["left", "pane.go:left", "Pane left"],
  ["down", "pane.go:down", "Pane down"],
  ["up", "pane.go:up", "Pane up"],
  ["right", "pane.go:right", "Pane right"],
  ["{", "pane.swap:left", "Swap left"],
  ["}", "pane.swap:right", "Swap right"],
  ["(", "space.prev", "Previous space"],
  [")", "space.next", "Next space"],
  ["$", "space.rename", "Rename space"],
  ["X", "tabs-juan.close-space", "Close space"],
  ["s", "mod.open:switch", "Switch space"],
  [":", "app.palette", "Command palette"],
  ["?", "app.help", "Help"],
  ["1", "tab.select:1", "Tab 1"],
  ["2", "tab.select:2", "Tab 2"],
  ["3", "tab.select:3", "Tab 3"],
  ["4", "tab.select:4", "Tab 4"],
  ["5", "tab.select:5", "Tab 5"],
  ["6", "tab.select:6", "Tab 6"],
  ["7", "tab.select:7", "Tab 7"],
  ["8", "tab.select:8", "Tab 8"],
  ["9", "tab.select:9", "Tab 9"],
  ["space", "tabs-juan.last", "Last tab"],
  ["a", "tabs-juan.attention", "Needs attention"],
  ["L", "tabs-juan.last-space", "Last space"],
  ["N", "mod.open:projects", "Projects"],
  ["i", "mod.open:new-pi", "New pi"],
  ["q", "tabs-juan.close-when-done", "Close when done"],
];

const REMIND_AFTER = 1500;
const MODIFIERS = new Set(["shift", "control", "ctrl", "alt", "cmd", "platform", "function", "fn", "super"]);

export default class Prefix extends View {
  init(_props, cx) {
    this.remind = false;
    this.handle = cx.focus_handle();
    cx.timer.after(0, () => this.handle.focus());
    cx.timer.after(REMIND_AFTER, (cx) => {
      this.remind = true;
      cx.notify();
    });
    cx.spawn(async () => {
      for (;;) {
        if ((await nextCommand()) === "send-prefix") this.sendPrefix();
      }
    });
  }

  dismiss() {
    closeOverlay(props().overlay);
  }

  sendPrefix() {
    const terminal = focused()?.terminal;
    if (terminal) hc(["keys", terminal, "ctrl+space"]);
    this.dismiss();
  }

  key(e, cx) {
    cx.stop_propagation();
    const key = chordKey(e);
    if (key === null) return;
    if (key === "ctrl-space") return this.sendPrefix();
    this.dismiss();
    const binding = BINDINGS.find(([k]) => k === key);
    if (binding) perform(binding[1]);
  }

  render() {
    const t = theme();
    return v_flex()
      .id("prefix")
      .track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .when(this.remind, (el) => el.child(reminder(t)));
  }
}

function chordKey(e) {
  if (MODIFIERS.has(e.key)) return null;
  const m = e.modifiers ?? {};
  if (m.control || m.alt || m.platform || m.function || !e.key_char) return e.keystroke;
  return e.key_char === " " ? "space" : e.key_char;
}

function perform(action) {
  const [name, value] = action.split(/:(.*)/s);
  if (value === undefined) return run(name);
  const first = commands().find((c) => c.name === name)?.args[0]?.name;
  run(name, { [first]: /^\d+$/.test(value) ? Number(value) : value });
}

function reminder(t) {
  const rows = new Map();
  for (const [key, action, label] of BINDINGS) {
    const row = rows.get(action) ?? { label, keys: [] };
    row.keys.push(key);
    rows.set(action, row);
  }
  const chip = (key) => div().px(5).rounded(4).bg(t.raised).text_color(t.foreground).child(key);
  return v_flex()
    .w_full()
    .p(12)
    .gap(8)
    .rounded(8)
    .border(1)
    .border_color(t.border)
    .bg(t.popover)
    .text_size(12)
    .text_color(t.muted)
    .child(h_flex().gap(6).child(div().font_semibold().text_color(t.foreground).child("ctrl-space")).child("press a key · Esc cancels"))
    .child(
      h_flex()
        .flex_wrap()
        .gap_y(4)
        .children(
          [...rows.values()].map((r) =>
            h_flex()
              .w("33%")
              .gap(6)
              .items_center()
              .child(h_flex().gap(2).children(r.keys.map(chip)))
              .child(div().truncate().child(r.label)),
          ),
        ),
    );
}
