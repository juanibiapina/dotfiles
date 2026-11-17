// Counts in the corner of the bottom bar, right after the attention dot: each
// source's logo with its count, shown only when above zero and dim after a
// failed check; a click opens the source's dialog. poller.js decides
// when to check, sources.js how. The inbox and mail mods set
// shared("notices.poke") after a change to read state, so the count follows;
// the inbox also sends how many threads it still lists.

import { View, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { exec, run, theme, shared, window } from "herdr";
import { createPoller } from "./poller.js";
import { createSources } from "./sources.js";

const TICK_MS = 5_000;

export default class Notices extends View {
  init(_props, cx) {
    this.poked = shared("notices.poke")?.at ?? 0;
    this.poller = createPoller({
      sources: createSources({ exec }),
      now: Date.now,
      load: () => JSON.parse(localStorage.getItem("state") ?? "null"),
      save: (state) => localStorage.setItem("state", JSON.stringify(state)),
    });
    cx.timer.every(TICK_MS, (cx) => this.tick(cx));
    this.tick(cx);
  }

  tick(cx) {
    cx.spawn(async (cx) => {
      if (await this.poller.tick({ active: window()?.active ?? true })) cx.notify();
    });
  }

  render() {
    const poke = shared("notices.poke");
    if (poke?.at > this.poked) {
      this.poked = poke.at;
      this.poller.poke(poke.source, poke.count);
    }
    const t = theme();
    const stop = (_e, cx) => cx.stop_propagation();
    return h_flex().size_full().items_center().gap(2).bg(t.chrome)
      .children(this.poller.entries().filter((e) => e.count > 0).map((e) => {
        const color = e.error ? t.dim : t.foreground;
        return h_flex().id(`notice-${e.id}`).h(22).px(6).gap(5).items_center().flex_none().rounded(5)
          .text_size(12).text_color(color).hover((s) => s.bg(t.hover))
          .tooltip(e.error ? `${e.title}: ${e.error}` : e.title)
          .on_mouse_down("left", stop)
          .on_click(() => run("mod.open", { name: e.open }))
          .child(svg(e.icon).size(13).text_color(color))
          .child(e.more ? `${e.count}+` : String(e.count));
      }));
  }
}
