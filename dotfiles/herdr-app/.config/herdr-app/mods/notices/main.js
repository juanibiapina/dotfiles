// The bottom bar's right corner, right aligned: the attention dot, then each
// source's logo with its count, shown only when above zero and dim after a
// failed check; a click opens the source's dialog. poller.js decides
// when to check, sources.js how. The inbox and mail mods set
// shared("notices.poke") after a change to read state, so the count follows.

import { View, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, terminals, exec, run, theme, shared, window } from "herdr";
import { createPoller } from "./poller.js";
import { createSources } from "./sources.js";

const TICK_MS = 5_000;

// One dot for the whole window, like tmux's status bar: some agent, in any
// space, is blocked or finished unseen. Clicking it shows that agent
// (blocked first, then the latest to finish). Snoozed agents don't count.
const attentionAgent = () => {
  const snoozed = new Set(terminals().filter((k) => k.labels?.["juan.snooze"]).map((k) => k.address));
  const waiting = agents().filter((a) => (a.status === "blocked" || a.status === "done") && !snoozed.has(a.address));
  const blocked = waiting.filter((a) => a.status === "blocked");
  return waiting.length ? (blocked.length ? blocked : waiting).reduce((a, b) => (b.seq > a.seq ? b : a)) : null;
};

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
      this.poller.poke(poke.source);
    }
    const t = theme();
    const stop = (_e, cx) => cx.stop_propagation();
    const pick = attentionAgent();
    return h_flex().size_full().items_center().justify_end().gap(2).bg(t.chrome)
      .when(Boolean(pick), (el) => el.child(h_flex().id("attention").h(22).px(6).items_center().flex_none().rounded(5)
        .text_size(13).text_color(t[pick.status] ?? t.unknown).hover((s) => s.bg(t.hover))
        .on_mouse_down("left", stop)
        .on_click(() => run("agent.focus", { terminal: pick.address }))
        .child("●")))
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
