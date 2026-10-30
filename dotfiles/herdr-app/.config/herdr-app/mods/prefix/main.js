import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { closeOverlay, commands, focused, hc, nextCommand, props, run, theme } from "herdr";

const CATEGORIES = [
  ["Tabs", [
    ["c", "tabs-juan.new-tab", "New tab"],
    ["n", "tab.next", "Next tab"],
    ["p", "tab.prev", "Previous tab"],
    ["space", "tabs-juan.last", "Last tab"],
    ...Array.from({ length: 9 }, (_, i) => [String(i + 1), `tab.select:${i + 1}`, "Select tab"]),
    [",", "tab.rename", "Rename tab"],
    ["&", "tab.close", "Close tab"],
  ]],
  ["Panes", [
    ["%", "pane.split:right", "Split right"],
    ["v", "pane.split:right", "Split right"],
    ["\"", "pane.split:down", "Split down"],
    ["V", "pane.split:down", "Split down"],
    ["h", "pane.go:left", "Pane left"],
    ["left", "pane.go:left", "Pane left"],
    ["j", "pane.go:down", "Pane down"],
    ["down", "pane.go:down", "Pane down"],
    ["k", "pane.go:up", "Pane up"],
    ["up", "pane.go:up", "Pane up"],
    ["l", "pane.go:right", "Pane right"],
    ["right", "pane.go:right", "Pane right"],
    ["{", "pane.swap:left", "Swap left"],
    ["}", "pane.swap:right", "Swap right"],
    ["z", "pane.zoom", "Zoom pane"],
    ["x", "pane.close", "Close pane"],
  ]],
  ["Spaces", [
    ["s", "mod.open:switch", "Switch space"],
    ["N", "mod.open:projects", "Projects"],
    ["(", "space.prev", "Previous space"],
    [")", "space.next", "Next space"],
    ["L", "tabs-juan.last-space", "Last space"],
    ["$", "space.rename", "Rename space"],
    ["X", "tabs-juan.close-space", "Close space"],
  ]],
  ["Agents", [
    ["i", "mod.open:new-pi", "New pi"],
    ["a", "tabs-juan.attention", "Needs attention"],
    ["q", "tabs-juan.close-when-done", "Close when done"],
  ]],
  ["App", [
    [":", "app.palette", "Command palette"],
    ["?", "app.help", "Help"],
  ]],
];

const BINDINGS = CATEGORIES.flatMap(([, bindings]) => bindings);

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

function rows(bindings) {
  const byLabel = new Map();
  for (const [key, , label] of bindings) {
    const row = byLabel.get(label) ?? { label, keys: [] };
    row.keys.push(key);
    byLabel.set(label, row);
  }
  return [...byLabel.values()].map((r) =>
    r.keys.length > 2 && r.keys.every((k) => /^\d$/.test(k)) ? { ...r, keys: [`${r.keys[0]}–${r.keys.at(-1)}`] } : r,
  );
}

function reminder(t) {
  const chip = (key) => div().px(5).rounded(4).bg(t.raised).text_color(t.foreground).child(key);
  const section = ([name, bindings]) =>
    v_flex()
      .gap(4)
      .child(div().font_semibold().text_color(t.accent).child(name))
      .child(
        h_flex()
          .flex_wrap()
          .gap_y(4)
          .children(
            rows(bindings).map((r) =>
              h_flex()
                .w("33%")
                .gap(6)
                .items_center()
                .child(h_flex().gap(2).children(r.keys.map(chip)))
                .child(div().truncate().child(r.label)),
            ),
          ),
      );
  return v_flex()
    .w_full()
    .p(12)
    .gap(10)
    .rounded(8)
    .border(1)
    .border_color(t.border)
    .bg(t.popover)
    .text_size(12)
    .text_color(t.muted)
    .child(h_flex().gap(6).child(div().font_semibold().text_color(t.foreground).child("ctrl-space")).child("press a key · Esc cancels"))
    .children(CATEGORIES.map(section));
}
