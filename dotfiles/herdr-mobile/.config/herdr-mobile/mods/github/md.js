// GitHub-flavored Markdown drawn with herdr-ui elements.
// Every string is its own native Text, so a line with inline styles (bold,
// code, links) is split into words in a wrapping row; plain lines stay one
// string. opts: { t, size, color, link(url), key, expanded: Set, toggle(key) }.

import { div, h_flex, v_flex, icon } from "herdr-ui";

// ---- HTML that GitHub bodies carry (templates, bots) ----

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#x27": "'", hellip: "…", mdash: "—", ndash: "–" };
const entities = (s) => s.replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? (e[0] === "#" ? String.fromCharCode(e[1] === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : m));

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? m[2] ?? m[3] ?? m[4] : null;
};

const BLOCK_TAGS = "details|p|div|picture|source|table|thead|tbody|tfoot|tr|ul|ol|center|blockquote|dl|dt|dd|section|article|figure|figcaption|video";
const INLINE_TAGS = "span|sub|sup|small|big|u|ins|del|s|font|abbr|mark|samp|var|g-emoji|td|th|a";

function htmlOutsideCode(s) {
  return s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const src = attr(tag, "src");
      return src ? `![${(attr(tag, "alt") || "image").replace(/[[\]]/g, "")}](${src})` : "";
    })
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (m, inner) => {
      const href = attr(m, "href");
      const text = inner.replace(/<[^>]+>/g, "").trim();
      return href ? `[${text || href}](${href})` : text;
    })
    .replace(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi, (_, x) => `\n\n**▸ ${x.replace(/<[^>]+>/g, "").trim()}**\n\n`)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n\n---\n\n")
    .replace(/<h([1-6])\b[^>]*>/gi, (_, n) => `\n\n${"#".repeat(Number(n))} `)
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/?(b|strong)>/gi, "**")
    .replace(/<\/?(i|em)>/gi, "_")
    .replace(/<\/?(code|kbd|tt)>/gi, "`")
    .replace(new RegExp(`</?(${BLOCK_TAGS})\\b[^>]*>`, "gi"), "\n\n")
    .replace(new RegExp(`</?(${INLINE_TAGS})\\b[^>]*>`, "gi"), "");
}

/** HTML and entities cleaned up, leaving code alone. */
function clean(src) {
  const parts = src.replace(/\r\n?/g, "\n").split(/(^[ \t]*(?:```|~~~)[\s\S]*?^[ \t]*(?:```|~~~)[ \t]*$)/m);
  return parts.map((p, i) => (i % 2 ? p : p.split(/(`+[^`\n]*?`+)/).map((q, j) => (j % 2 ? q : entities(htmlOutsideCode(q)))).join(""))).join("");
}

// ---- Blocks ----

const FENCE = /^(\s*)(`{3,}|~{3,})\s*([^`\s]*)/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)(\s+#+)?\s*$/;
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>/;
const ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

const isTable = (lines, i) => lines[i].includes("|") && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes("-");
const startsBlock = (lines, i) => FENCE.test(lines[i]) || HEADING.test(lines[i]) || HR.test(lines[i]) || QUOTE.test(lines[i]) || ITEM.test(lines[i]) || isTable(lines, i);
const cells = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));

export function parse(src) {
  const lines = src.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(FENCE))) {
      const close = new RegExp(`^\\s*${m[2][0] === "`" ? "`" : "~"}{${m[2].length},}\\s*$`);
      const body = [];
      i++;
      while (i < lines.length && !close.test(lines[i])) body.push(lines[i++].replace(new RegExp(`^ {0,${m[1].length}}`), ""));
      i++;
      out.push({ type: "code", lang: m[3].toLowerCase(), lines: body });
    } else if ((m = line.match(HEADING))) {
      out.push({ type: "heading", level: m[1].length, text: m[2] });
      i++;
    } else if (HR.test(line)) {
      out.push({ type: "hr" });
      i++;
    } else if (QUOTE.test(line)) {
      const body = [];
      while (i < lines.length && QUOTE.test(lines[i])) body.push(lines[i++].replace(/^\s{0,3}> ?/, ""));
      const alert = body[0] && body[0].match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
      out.push({ type: "quote", alert: alert ? alert[1].toUpperCase() : null, blocks: parse(body.slice(alert ? 1 : 0).join("\n")) });
    } else if (isTable(lines, i)) {
      const head = cells(line);
      const align = cells(lines[i + 1]).map((c) => (c.endsWith(":") ? (c.startsWith(":") ? "center" : "right") : "left"));
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(cells(lines[i++]));
      out.push({ type: "table", head, align, rows });
    } else if (ITEM.test(line)) {
      const items = [];
      while (i < lines.length) {
        const l = lines[i];
        const im = l.match(ITEM);
        if (im) {
          const task = im[3].match(/^\[([ xX])\]\s+(.*)$/);
          items.push({ indent: im[1].replace(/\t/g, "    ").length, marker: im[2], task: task ? task[1] !== " " : null, text: task ? task[2] : im[3] });
          i++;
        } else if (!l.trim()) {
          let j = i + 1;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && (ITEM.test(lines[j]) || /^\s{2,}\S/.test(lines[j]))) i = j;
          else break;
        } else if (/^\s+\S/.test(l) || !startsBlock(lines, i)) {
          items[items.length - 1].text += "\n" + l.trim();
          i++;
        } else break;
      }
      // Indents become levels, whatever spacing the author used.
      const stops = [...new Set(items.map((x) => x.indent))].sort((a, b) => a - b);
      for (const x of items) x.level = Math.min(stops.indexOf(x.indent), 4);
      out.push({ type: "list", items });
    } else {
      const body = [];
      while (i < lines.length && lines[i].trim() && (body.length === 0 || !startsBlock(lines, i))) body.push(lines[i++]);
      out.push({ type: "para", lines: body });
    }
  }
  return out;
}

// ---- Inline ----

const EMOJI = { "+1": "👍", "-1": "👎", thumbsup: "👍", thumbsdown: "👎", tada: "🎉", rocket: "🚀", warning: "⚠️", white_check_mark: "✅", x: "❌", heavy_check_mark: "✔️", bug: "🐛", sparkles: "✨", fire: "🔥", eyes: "👀", heart: "❤️", smile: "😄", memo: "📝", bulb: "💡", construction: "🚧", lock: "🔒", zap: "⚡", package: "📦", wrench: "🔧", hammer: "🔨", recycle: "♻️", art: "🎨", boom: "💥", green_circle: "🟢", red_circle: "🔴", yellow_circle: "🟡", robot: "🤖", information_source: "ℹ️", question: "❓", exclamation: "❗", star: "⭐", check: "✔️" };

// Inline rules by the character they start with: QuickJS has no JIT, so
// one big alternation tried at every position is too slow for long bodies.
// Each rule: [sticky regex, segment(s) from the match, previous chars that rule it out].
const LINK = /\[((?:[^\][]|\[[^\]]*\])+)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/y;
const RULES = {
  "`": [[/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/y, (m, st) => [{ ...st, code: true, text: m[2].replace(/^ (.*) $/, "$1") }]]],
  "!": [[/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/y, (m, st) => [{ ...st, img: true, href: m[2], text: m[1] || "image" }]]],
  "[": [[LINK, (m, st) => inline(m[1], { ...st, href: m[2] })]],
  "<": [[/<(https?:\/\/[^>\s]+)>/y, (m, st) => [{ ...st, href: m[1], text: shortUrl(m[1]) }]]],
  h: [[/https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"*_\]]/y, (m, st) => [{ ...st, href: m[0], text: shortUrl(m[0]) }], /\w/]],
  "*": [
    [/\*\*(?!\s)([\s\S]+?)\*\*/y, (m, st) => inline(m[1], { ...st, b: true })],
    [/\*(?![\s*])([^*\n]+?)\*(?![\w*])/y, (m, st) => inline(m[1], { ...st, i: true }), /[\w*\\]/],
  ],
  _: [
    [/__(?!\s)([\s\S]+?)__(?!\w)/y, (m, st) => inline(m[1], { ...st, b: true }), /\w/],
    [/_(?![\s_])([^_\n]+?)_(?![\w_])/y, (m, st) => inline(m[1], { ...st, i: true }), /[\w_\\]/],
  ],
  "~": [[/~~(?!\s)([\s\S]+?)~~/y, (m, st) => inline(m[1], { ...st, s: true })]],
  "@": [[/@([A-Za-z0-9][\w-]*(?:\/[\w.-]+)?)/y, (m, st) => [{ ...st, mention: true, text: m[0] }], /[\w@/`]/]],
  "#": [[/#\d+(?!\w)/y, (m, st) => [{ ...st, ref: m[0], text: m[0] }], /[\w&#`]/]],
  ":": [[/:([a-z0-9_+-]+):/y, (m, st) => (EMOJI[m[1]] ? [{ ...st, text: EMOJI[m[1]] }] : null)]],
};
const TRIGGERS = "[`!\\[<h*_~@#:]";
const REPO_BEFORE = /(?:^|[^\w./-])([\w.-]+\/[\w.-]+)$/;

/** Segments: { text, b, i, s, code, href, mention, ref, img }. */
export function inline(src, style = {}) {
  const out = [];
  let last = 0;
  const scan = new RegExp(TRIGGERS, "g");
  for (let c; (c = scan.exec(src)); ) {
    const i = c.index;
    const prev = i > 0 ? src[i - 1] : "";
    for (const [re, make, not] of RULES[c[0]]) {
      if (not && prev && not.test(prev) && !(c[0] === "#" && REPO_BEFORE.test(src.slice(last, i)))) continue;
      re.lastIndex = i;
      const m = re.exec(src);
      if (!m) continue;
      const end = re.lastIndex;
      let from = i;
      let segs = make(m, style);
      if (!segs) continue;
      // owner/repo#12: the repo is already in the plain text before it.
      if (c[0] === "#") {
        const r = src.slice(last, i).match(REPO_BEFORE);
        if (r) {
          from = i - r[1].length;
          segs = [{ ...style, ref: r[1] + m[0], text: r[1] + m[0] }];
        }
      }
      if (from > last) out.push({ ...style, text: src.slice(last, from) });
      out.push(...segs);
      last = end;
      scan.lastIndex = end;
      break;
    }
  }
  if (last < src.length) out.push({ ...style, text: src.slice(last) });
  return out.map((s) => (s.code ? s : { ...s, text: s.text.replace(/\\([\\`*_{}[\]()#+\-.!|~<>])/g, "$1") }));
}

// github.com/o/r/pull/12 reads as o/r#12, like on GitHub.
function shortUrl(url) {
  const m = url.match(/^https?:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/(?:pull|issues)\/(\d+)(#.*)?$/);
  if (m) return `${m[1]}#${m[2]}${m[3] ? " (comment)" : ""}`;
  return url.replace(/^https?:\/\//, "");
}

function piece(o, s, text) {
  const t = o.t;
  let el = div().child(text);
  if (s.code) el = el.font_mono().text_size(o.size - 2).bg(t.raised).rounded(4).px(3);
  if (s.b) el = el.font_bold();
  if (s.i) el = el.italic();
  if (s.s) el = el.line_through();
  if (s.mention) el = el.font_semibold().text_color(t.foreground);
  if (s.href || s.ref) {
    el = el.text_color(t.accent);
    const go = () => o.link(s.href ?? s.ref);
    el = el.on_click(go);
  }
  return el;
}

/** One line of inline Markdown at the given size. */
const TRIGGER_TEST = new RegExp(TRIGGERS);

export function line(text, o, extra = {}) {
  const segs = TRIGGER_TEST.test(text) ? inline(text) : [{ text }];
  const plain = segs.every((s) => !s.code && !s.b && !s.i && !s.s && !s.href && !s.mention && !s.ref && !s.img);
  const base = (el) => el.text_size(o.size).text_color(o.color ?? o.t.foreground)
    .when(extra.bold, (e) => e.font_bold()).when(extra.mono, (e) => e.font_mono());
  if (plain) return base(div()).child(segs.map((s) => s.text).join(""));
  const words = [];
  segs.forEach((s, si) => {
    if (s.img) {
      words.push(h_flex().id(`i${si}`).gap(4).items_center().px(6).py(2).mr(4).rounded(6).bg(o.t.raised).on_click(() => o.link(s.href))
        .child(icon("image-outline").size(o.size).text_color(o.t.accent))
        .child(div().text_size(o.size - 2).text_color(o.t.accent).child(s.text)));
      return;
    }
    const parts = s.code && s.text.length < 32 ? [s.text] : s.text.match(/\S+\s*|\s+/g) ?? [];
    const styled = s.code || s.b || s.i || s.s || s.href || s.mention || s.ref;
    for (const w of parts) {
      if (!w.trim() && words.length === 0) continue;
      // Plain words go as bare strings: each is a Text in the row, and cheap.
      words.push(styled ? piece(o, s, w) : w);
    }
  });
  return base(h_flex().flex_wrap().items_center()).children(words);
}

// ---- Drawing blocks ----

const ALERTS = {
  NOTE: { icon: "information-circle-outline", color: "accent", label: "Note" },
  TIP: { icon: "bulb-outline", color: "done", label: "Tip" },
  IMPORTANT: { icon: "alert-circle-outline", color: "ansi5", label: "Important" },
  WARNING: { icon: "warning-outline", color: "working", label: "Warning" },
  CAUTION: { icon: "flame-outline", color: "blocked", label: "Caution" },
};

const CODE_LIMIT = 60;

function codeBlock(o, b, key) {
  const t = o.t;
  const long = b.lines.length > CODE_LIMIT && !o.expanded?.has(key);
  const shown = long ? b.lines.slice(0, CODE_LIMIT) : b.lines;
  const color = (l) => {
    if (b.lang !== "diff" && b.lang !== "patch") return t.foreground;
    if (l.startsWith("+")) return t.done;
    if (l.startsWith("-")) return t.blocked;
    if (l.startsWith("@@")) return t.ansi6;
    return t.foreground;
  };
  return v_flex().rounded(8).bg(t.canvas).border(1).border_color(t.border).overflow_hidden()
    .when(b.lang === "suggestion", (el) => el.child(div().px(10).py(6).bg(t.raised).text_size(12).font_semibold().text_color(t.muted).child("Suggested change")))
    .child(div().overflow_x_scroll().child(v_flex().p(10)
      .children(shown.map((l, i) => div().id(i).whitespace_nowrap().font_mono().text_size(12).line_height(18).text_color(color(l)).child(l || " ")))))
    .when(long, (el) => el.child(div().id("more").px(10).py(8).bg(t.raised).on_click((_e, cx) => o.toggle(key, cx))
      .child(div().text_size(13).text_color(t.accent).child(`Show ${b.lines.length - CODE_LIMIT} more lines`))));
}

function table(o, b) {
  const t = o.t;
  const cols = b.head.length;
  const width = Array.from({ length: cols }, (_, c) =>
    Math.min(260, Math.max(56, ...[b.head, ...b.rows].map((r) => (r[c] ?? "").replace(/[*`_]|\]\([^)]*\)/g, "").length * 7.4 + 20))));
  const row = (r, head, i) => h_flex().id(i).bg(head ? t.raised : i % 2 ? t.surface : t.background).border_b(1).border_color(t.border)
    .children(Array.from({ length: cols }, (_, c) => div().id(c).w(width[c]).px(8).py(6)
      .child(line(r[c] ?? "", { ...o, size: o.size - 2 }, { bold: head }))));
  return div().overflow_x_scroll().child(v_flex().rounded(8).border(1).border_color(t.border).overflow_hidden()
    .child(row(b.head, true, "h"))
    .children(b.rows.map((r, i) => row(r, false, i))));
}

function list(o, b) {
  let n = 0;
  return v_flex().gap(4).children(b.items.map((it, i) => {
    const ordered = /\d/.test(it.marker);
    if (ordered && it.level === 0) n = n ? n + 1 : Number.parseInt(it.marker, 10);
    const mark = it.task !== null
      ? icon(it.task ? "checkbox" : "square-outline").size(o.size + 2).text_color(it.task ? o.t.done : o.t.muted)
      : div().text_size(o.size).text_color(o.t.muted).child(ordered ? `${it.level === 0 ? n : Number.parseInt(it.marker, 10)}.` : ["•", "◦", "▪"][it.level % 3]);
    return h_flex().id(i).pl(it.level * 18).gap(6).items_start()
      .child(h_flex().w(ordered ? 24 : 16).flex_none().justify_end().pr(2).child(mark))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .children(it.text.split("\n").map((l, j) => line(l, o).id(j))));
  }));
}

function block(o, b, key) {
  const t = o.t;
  switch (b.type) {
    case "para":
      return v_flex().gap(2).children(b.lines.map((l, i) => line(l.trim(), o).id(i)));
    case "heading": {
      const size = [22, 19, 17, 16, 15, 14][b.level - 1] + (o.size - 15);
      return v_flex().pt(4).when(b.level <= 2, (el) => el.pb(6).border_b(1).border_color(t.border))
        .child(line(b.text, { ...o, size }, { bold: true }));
    }
    case "hr":
      return div().h(1).bg(t.border).my(4);
    case "code":
      return codeBlock(o, b, key);
    case "table":
      return table(o, b);
    case "list":
      return list(o, b);
    case "quote": {
      const a = b.alert && ALERTS[b.alert];
      const color = a ? t[a.color] : t.border;
      return h_flex().gap(10)
        .child(div().w(3).rounded(2).bg(color))
        .child(v_flex().flex_1().min_w(0).gap(8).py(2)
          .when(Boolean(a), (el) => el.child(h_flex().gap(6).items_center()
            .child(icon(a.icon).size(16).text_color(color))
            .child(div().text_size(o.size - 1).font_semibold().text_color(color).child(a.label))))
          .children(b.blocks.map((x, i) => block({ ...o, color: a ? t.foreground : t.muted }, x, `${key}.${i}`).id(i))));
    }
  }
  return null;
}

/** A Markdown body as one element. */
export function markdown(src, o) {
  const opts = { ...o, size: o.size ?? 15 };
  const blocks = parse(clean(src ?? ""));
  return v_flex().gap(10).children(blocks.map((b, i) => block(opts, b, `${opts.key ?? "md"}.${i}`).id(i)));
}
