import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, TextareaState, Textarea, TextView, Scrollbar } from "gpui-base";
import { agents, exec, focused, panes, props, readTextFile, run, theme } from "herdr";

/** @typedef {{ path: string, title: string, machine: string | null, terminal: string | null }} PlanProps */

const WHOLE = "(Whole plan)";

const fenceOf = (line) => line.match(/^\s*(`{3,}|~{3,})/)?.[1] ?? null;
const closesFence = (line, fence) => {
  const s = line.trim();
  return s.length >= fence.length && s[0] === fence[0] && /^(`+|~+)$/.test(s);
};

// Splits markdown into the blocks a comment can attach to: paragraphs,
// headings, top-level list items (with their nested items and indented
// paragraphs), fenced code and tables.
function splitBlocks(markdown) {
  const blocks = [];
  let cur = null;
  let fence = null;
  let blank = 0;
  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    if (fence) {
      cur.lines.push(line);
      if (closesFence(line, fence)) fence = null;
      continue;
    }
    if (!line.trim()) {
      if (cur) blank++;
      continue;
    }
    const heading = /^#{1,6}(\s|$)/.test(line);
    const item = /^([-*+]|\d{1,9}[.)])(\s|$)/.test(line);
    const joins = cur && (blank > 0 ? /^\s/.test(line) && cur.list : !heading && !item && !cur.heading);
    if (joins) {
      for (; blank > 0; blank--) cur.lines.push("");
      cur.lines.push(line);
    } else {
      cur = { lines: [line], list: item, heading };
      blocks.push(cur);
    }
    blank = 0;
    fence = fenceOf(line);
  }
  return blocks.map((b) => b.lines.join("\n"));
}

// The same text pi-plans' web page sends, so agents see one format.
function reviewMessage(p, comments) {
  const id = p.path.split("/").pop().replace(/\.md$/, "");
  return [`Review of plan: ${p.title}`, `Plan ID: ${id}`, `Markdown: ${p.path}`, "",
    ...comments.flatMap((c, i) => [`${i + 1}. Selected text:`, c.quote ?? WHOLE, "Comment:", c.text, ""])].join("\n");
}

function sendError(r) {
  try {
    const message = JSON.parse(r.stderr).error?.message;
    if (message) return message;
  } catch (_error) {}
  return r.stderr.trim() || r.stdout.trim() || "hc send failed";
}

// Enter saves and Shift+Enter adds a line. The textarea inserts the newline
// before it reports Enter, so this keeps the text from before each change and
// puts it back before saving. Returns the setter to use instead of set_value.
// Copied from mods/inbox, since a mod can't import across mod folders.
function enterSends(state, send) {
  let now = state.value();
  let before = now;
  state.on("change", () => { before = now; now = state.value(); });
  state.on("submit", (e, cx) => {
    if (e.shift || e.secondary) return;
    state.set_value(before);
    now = before;
    send(cx);
  });
  return (text) => {
    state.set_value(text);
    state.set_selected_range({ start: text.length, end: text.length });
    now = before = text;
  };
}

// A saved plan, rendered block by block, with comments that go to the pi
// session as one review (Submit) or an approval (Approve).
export default class Plan extends View {
  init(_props, cx) {
    this.markdown = null;
    this.loadError = null;
    this.comments = [];
    this.nextId = 1;
    this.draft = null; // { quote, editing }: quote null for the whole plan, editing a comment id or null
    this.pending = null; // "review" | "approval"
    this.notice = null;
    this.error = null;
    this.approved = false;
    this.lastStatus = null;
    this.handle = cx.focus_handle();
    this.text = TextareaState.new({ rows: 3, placeholder: "Comment…" });
    this.text.set_auto_grow(3, 12);
    this.setText = enterSends(this.text, (cx) => this.saveDraft(cx));
    this.load(cx);
  }

  load(cx) {
    const p = props();
    if (!p?.path) return;
    cx.spawn(async (cx) => {
      try {
        const text = await readTextFile(p.path, { on: p.machine ?? null });
        if (text == null) {
          this.loadError = "Plan is missing";
        } else {
          if (text !== this.markdown) this.approved = false;
          this.markdown = text;
          this.loadError = null;
        }
      } catch (error) {
        this.loadError = String(error?.message ?? error);
      }
      cx.notify();
    });
  }

  openDraft(quote, editing, text, cx) {
    this.draft = { quote, editing };
    this.setText(text);
    this.text.focus();
    cx.notify();
  }

  saveDraft(cx) {
    const d = this.draft;
    if (!d) return;
    const text = this.text.value().trim();
    if (text) {
      if (d.editing != null) this.comments = this.comments.map((c) => (c.id === d.editing ? { ...c, text } : c));
      else this.comments = [...this.comments, { id: this.nextId++, quote: d.quote, text }];
      this.approved = false;
      this.notice = null;
    }
    this.cancelDraft(cx);
  }

  cancelDraft(cx) {
    this.draft = null;
    this.setText("");
    this.handle.focus();
    cx.notify();
  }

  remove(id, cx) {
    this.comments = this.comments.filter((c) => c.id !== id);
    if (this.draft?.editing === id) this.draft = null;
    this.approved = false;
    cx.notify();
  }

  send(kind, cx) {
    const p = props();
    if (this.pending || !p?.terminal) return;
    if (kind === "review" && !this.comments.length) return;
    const message = kind === "review" ? reviewMessage(p, this.comments) : "Implement";
    const sent = this.comments;
    this.pending = kind;
    this.error = null;
    this.notice = null;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const r = await exec("hc", ["send", p.terminal, message], { timeout: 120000 });
        if (r.code !== 0) throw new Error(sendError(r));
        let working = false;
        try { working = JSON.parse(r.stdout).status === "working"; } catch (_error) {}
        if (kind === "review") {
          this.comments = this.comments.filter((c) => !sent.includes(c));
          this.notice = working ? "Comments sent; Pi reads them after its current step" : "Comments sent to Pi";
        } else {
          this.approved = true;
          this.notice = working ? "Plan approved. Pi reads it after its current step" : "Plan approved and sent to Pi";
        }
      } catch (error) {
        this.error = String(error?.message ?? error);
      }
      this.pending = null;
      cx.notify();
    });
  }

  // Reads the plan again when the session's agent finishes a turn, since the
  // plan only changes while the agent works.
  watchAgent(p, cx) {
    const status = agents().find((a) => a.address === p.terminal)?.status ?? null;
    if (this.lastStatus === "working" && status !== "working") this.load(cx);
    this.lastStatus = status;
  }

  key(e, cx) {
    if (e.key === "escape" && this.draft) this.cancelDraft(cx);
  }

  render(cx) {
    const t = theme();
    const p = props();
    const root = v_flex().id("plan").size_full().min_h(0).bg(t.background).text_size(13).text_color(t.foreground)
      .track_focus(this.handle).on_key_down((e, cx) => this.key(e, cx));
    if (!p?.path) return root.p(16).child(div().text_color(t.dim).child("No plan"));
    this.watchAgent(p, cx);

    const blocks = this.markdown == null ? [] : splitBlocks(this.markdown);
    const under = new Map();
    const loose = [];
    for (const c of this.comments) {
      const i = c.quote == null ? -1 : blocks.indexOf(c.quote);
      if (i < 0) loose.push(c);
      else under.set(i, [...(under.get(i) ?? []), c]);
    }
    const looseDraft = this.draft && this.draft.editing == null && (this.draft.quote == null || !blocks.includes(this.draft.quote));

    const body = this.markdown == null
      ? [div().p(16).text_color(this.loadError ? t.ansi1 : t.dim).child(this.loadError ?? "Loading…")]
      : [
        ...(loose.length || looseDraft ? [v_flex().px(16).pt(12).gap(6)
          .children(loose.map((c) => this.card(t, c, true)))
          .when(looseDraft, (el) => el.child(this.composer(t)))] : []),
        ...blocks.map((text, i) => this.block(t, i, text, under.get(i) ?? [])),
      ];

    return root
      .child(this.header(t, p))
      .child(div().flex_1().min_h(0).relative()
        .child(v_flex().id("plan-body").absolute().inset_0().overflow_y_scroll().pb(24).children(body))
        .child(Scrollbar.vertical("plan-body").absolute().inset_0()));
  }

  // A tab has at most one plan pane (the workbench replaces it), and clicking
  // focuses this pane, so the focused tab's plan pane is this one.
  close() {
    const tab = focused()?.tab;
    const pane = panes().find((x) => x.mod === "plan" && x.tab === tab);
    if (!pane || this.closing) return;
    this.closing = true;
    run("pane.close", { pane: pane.pane });
  }

  header(t, p) {
    const n = this.comments.length;
    const busy = Boolean(this.pending);
    const button = (id, label, { primary = false, enabled = true, onClick }) =>
      div().id(id).px(10).h(26).flex().flex_none().items_center().rounded(6).text_size(12)
        .bg(primary ? t.solid : t.raised).text_color(primary ? t.solid_foreground : t.foreground)
        .when(!enabled, (el) => el.opacity(0.5))
        .when(enabled, (el) => el.cursor_pointer().hover((s) => s.opacity(0.85)).on_click(onClick))
        .child(label);
    const line = this.error ? [this.error, t.ansi1] : this.loadError && this.markdown != null ? [this.loadError, t.ansi1] : this.notice ? [this.notice, t.ansi2] : null;
    return v_flex().flex_none().px(16).pt(12).pb(10).gap(8).bg(t.chrome).border_b(1).border_color(t.border)
      .child(h_flex().gap(8).items_center()
        .child(svg("mods/workspace-chrome/file-text.svg").size(14).flex_none().text_color(t.ansi5))
        .child(div().flex_1().min_w(0).truncate().font_semibold().text_size(14).child(p.title || "Plan"))
        .child(div().id("close").size(22).flex().flex_none().items_center().justify_center().rounded(5).cursor_pointer()
          .text_color(t.muted).hover((s) => s.bg(t.hover).text_color(t.foreground)).tooltip("Close plan")
          .on_click((_e, cx) => {
            // As the pane header's close button: the pane around this mod
            // would otherwise act on the click after the pane is gone.
            cx.stop_propagation();
            this.close();
          })
          .child(svg("mods/pane/close.svg").size(13))))
      .child(h_flex().gap(6).items_center()
        .child(button("whole", "Comment on whole plan", { onClick: (_e, cx) => this.openDraft(null, null, "", cx) }))
        .child(div().flex_1())
        .child(button("submit", this.pending === "review" ? "Sending…" : `Submit (${n})`, { enabled: n > 0 && !busy, onClick: (_e, cx) => this.send("review", cx) }))
        .child(button("approve", this.pending === "approval" ? "Sending…" : this.approved ? "✓ Approved" : "Approve", {
          primary: true, enabled: !busy && !this.approved, onClick: (_e, cx) => this.send("approval", cx),
        })))
      .when(Boolean(line), (el) => el.child(div().text_size(11.5).text_color(line[1]).child(line[0])));
  }

  block(t, i, text, comments) {
    const drafting = this.draft && this.draft.editing == null && this.draft.quote === text;
    return v_flex().id(`row-${i}`).flex_none()
      .child(h_flex().items_start()
        .child(div().w(32).flex_none().pt(2).flex().justify_center()
          .child(div().id(`add-${i}`).size(20).flex().items_center().justify_center().rounded(5).cursor_pointer()
            .text_color(drafting ? t.accent : t.dim).opacity(drafting ? 1 : 0.4)
            .hover((s) => s.bg(t.hover).text_color(t.accent).opacity(1))
            .tooltip("Comment on this block")
            .on_click((_e, cx) => this.openDraft(text, null, "", cx))
            .child(svg("mods/workspace-chrome/square-pen.svg").size(12))))
        .child(div().flex_1().min_w(0).pr(16).py(4).child(TextView.markdown(`blk-${i}`, text).selectable())))
      .when(comments.length > 0 || drafting, (el) => el.child(v_flex().pl(32).pr(16).pb(6).gap(6)
        .children(comments.map((c) => this.card(t, c, false)))
        .when(drafting, (el) => el.child(this.composer(t)))));
  }

  card(t, c, showQuote) {
    if (this.draft?.editing === c.id) return this.composer(t);
    const action = (id, label, onClick) => div().id(id).px(4).rounded(4).cursor_pointer().text_color(t.dim)
      .hover((s) => s.text_color(t.foreground).bg(t.hover)).on_click(onClick).child(label);
    const quote = c.quote == null ? WHOLE : c.quote.split("\n")[0];
    return v_flex().id(`cm-${c.id}`).flex_none().px(10).py(6).gap(4).rounded(6).bg(t.raised).border_l(2).border_color(t.accent)
      .when(showQuote, (el) => el.child(div().text_size(11).text_color(t.dim).truncate().child(quote)))
      .child(div().text_size(12.5).child(c.text))
      .child(h_flex().gap(4).text_size(11)
        .child(action(`ed-${c.id}`, "Edit", (_e, cx) => this.openDraft(c.quote, c.id, c.text, cx)))
        .child(action(`rm-${c.id}`, "Delete", (_e, cx) => this.remove(c.id, cx))));
  }

  composer(t) {
    const title = this.draft.editing != null ? "Edit comment" : this.draft.quote == null ? "Comment on whole plan" : "Comment";
    const action = (id, label, primary, onClick) => div().id(id).px(8).h(22).flex().items_center().rounded(5).cursor_pointer().text_size(11.5)
      .bg(primary ? t.solid : t.raised).text_color(primary ? t.solid_foreground : t.muted)
      .hover((s) => s.opacity(0.85)).on_click(onClick).child(label);
    return v_flex().id("composer").flex_none().p(8).gap(6).rounded(6).bg(t.surface).border(1).border_color(t.accent)
      .child(h_flex().gap(8).items_center()
        .child(div().flex_1().text_size(11.5).font_semibold().text_color(t.muted).child(title))
        .child(div().text_size(11).text_color(t.dim).child("↵ save · ⇧↵ newline · Esc cancel")))
      .child(Textarea.new(this.text).w_full().text_size(12.5).text_color(t.foreground))
      .child(h_flex().gap(6).justify_end()
        .child(action("cancel", "Cancel", false, (_e, cx) => this.cancelDraft(cx)))
        .child(action("save", "Save", true, (_e, cx) => this.saveDraft(cx))));
  }
}
