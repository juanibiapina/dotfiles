// Plain JavaScript decoding: the phone's runtime has neither Buffer nor
// TextDecoder, and this file runs there too (herdr-mobile's mail mod).

const header = (headers, name) => headers?.find((h) => h.name.toLowerCase() === name)?.value ?? "";

const SINGLE_BYTE = /^(iso-8859-1|latin1|us-ascii|windows-1252|cp1252)$/;

const B64 = {};
[..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"].forEach((c, i) => { B64[c] = i; });
B64["-"] = 62;
B64["_"] = 63;

// Base64 or base64url to bytes; skips padding and anything else.
function base64(data) {
  const out = [];
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < data.length; i++) {
    const v = B64[data[i]];
    if (v === undefined) continue;
    acc = ((acc << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  return out;
}

// UTF-8 bytes to text; a broken sequence becomes U+FFFD.
function utf8(bytes) {
  const codes = [];
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    const need = b < 0x80 ? 0 : b >= 0xf0 && b < 0xf8 ? 3 : b >= 0xe0 ? 2 : b >= 0xc2 && b < 0xe0 ? 1 : -1;
    if (need < 0) { codes.push(0xfffd); i++; continue; }
    let cp = need === 0 ? b : b & (0x3f >> need);
    let ok = i + need < bytes.length;
    for (let k = 1; ok && k <= need; k++) {
      const c = bytes[i + k];
      if ((c & 0xc0) !== 0x80) ok = false;
      else cp = (cp << 6) | (c & 0x3f);
    }
    if (!ok) { codes.push(0xfffd); i++; continue; }
    codes.push(cp > 0x10ffff || (cp >= 0xd800 && cp < 0xe000) ? 0xfffd : cp);
    i += need + 1;
  }
  let text = "";
  for (let i = 0; i < codes.length; i += 4096) text += String.fromCodePoint(...codes.slice(i, i + 4096));
  return text;
}

function decode(part) {
  const bytes = base64(part.body.data);
  const charset = header(part.headers, "content-type").match(/charset\s*=\s*"?([^";\s]+)/i)?.[1]?.toLowerCase();
  if (charset && SINGLE_BYTE.test(charset)) {
    let text = "";
    for (const b of bytes) text += String.fromCharCode(b);
    return text;
  }
  return utf8(bytes);
}

const LATIN1 = ("nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot " +
  "cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave " +
  "Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute " +
  "acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml " +
  "divide oslash ugrave uacute ucirc uuml yacute thorn yuml").split(" ");

const ENTITIES = {
  ...Object.fromEntries(LATIN1.map((name, i) => [name, String.fromCharCode(160 + i)])),
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", trade: "™", euro: "€", bull: "•", zwnj: "", zwj: "", shy: "",
};

function entities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, name) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
    }
    return ENTITIES[name] ?? ENTITIES[name.toLowerCase()] ?? all;
  });
}

const BLOCK = "p|h[1-6]|table|ul|ol|blockquote|pre|section|article|header|footer|hr";
const LINE = "div|tr|li|dt|dd";

// Marks a heading line in the text, for lines() to draw it bold.
const HEADING = "\u0003";
// Stands in for a rendered table until the rest of the HTML is text.
const TABLE_TOKEN = "\u0002";
const INNER_TABLE = /<table\b[^>]*>((?:(?!<table\b)[\s\S])*?)<\/table\s*>/i;
const MAX_CELL = 40;
// Wraps a link's label as LINK_OPEN index LINK_MID label LINK_CLOSE, the index
// pointing into the message's links, so the text shows labels, not addresses.
const LINK_OPEN = "\u0004";
const LINK_MID = "\u0005";
const LINK_CLOSE = "\u0006";
const MARKERS = /\u0004\d+\u0005|\u0006|\u0003/g;
const visible = (s) => s.replace(MARKERS, "");
const pad = (s, n) => s + " ".repeat(Math.max(0, n - visible(s).length));

// A table whose rows have two or more short cells is data: its columns are
// aligned. Any other table only lays a page out: its cells become lines.
function renderTable(inner, store, links) {
  const rows = [...inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)]
    .map((r) => [...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]\s*>/gi)].map((c) => htmlToText(c[1], store, links)));
  if (!rows.length) return htmlToText(inner, store, links);
  const cells = rows.flat().filter(Boolean);
  const data = rows.some((r) => r.filter(Boolean).length >= 2) && cells.every((c) => !c.includes("\n") && visible(c).length <= MAX_CELL);
  if (!data) return rows.map((r) => r.filter(Boolean).join("\n")).filter(Boolean).join("\n");
  const width = Math.max(...rows.map((r) => r.length));
  const used = [...Array(width).keys()].filter((i) => rows.some((r) => r[i]));
  const widths = used.map((i) => Math.max(...rows.map((r) => visible(r[i] ?? "").length)));
  return rows
    .filter((r) => r.some(Boolean))
    .map((r) => used.map((i, n) => pad(r[i] ?? "", n === used.length - 1 ? 0 : widths[n])).join("  ").trimEnd())
    .join("\n");
}

function htmlToText(html, store = [], links = []) {
  let source = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(head|style|script|title)\b[\s\S]*?<\/\1\s*>/gi, "");
  for (let m; (m = INNER_TABLE.exec(source)); ) {
    store.push(renderTable(m[1], store, links));
    source = `${source.slice(0, m.index)}<p>${TABLE_TOKEN}${store.length - 1}${TABLE_TOKEN}</p>${source.slice(m.index + m[0].length)}`;
  }
  const text = source
    .replace(/\s+/g, " ")
    .replace(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]\s*>/gi, `<p>${HEADING}$1</p>`)
    .replace(/<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi, (all, _q, href, inner) => {
      const label = inner.replace(/<[^>]*>/g, "").trim();
      const url = entities(href).trim();
      if (!/^https?:/i.test(url) || !label) return inner;
      links.push(url);
      return `${LINK_OPEN}${links.length - 1}${LINK_MID}${inner}${LINK_CLOSE}`;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(new RegExp(`</?(?:${BLOCK})\\b[^>]*>`, "gi"), "\n\n")
    .replace(new RegExp(`</?(?:${LINE})\\b[^>]*>`, "gi"), "\n")
    .replace(/<\/?t[dh]\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "");
  const flat = tidy(entities(text).split("\n").map((l) => l.replace(/[ \t\u00a0]+/g, " ").trim()).join("\n"));
  return tidy(flat.replace(new RegExp(`${TABLE_TOKEN}(\\d+)${TABLE_TOKEN}`, "g"), (_, i) => store[Number(i)]));
}

function tidy(text) {
  return text
    .replace(/[\u200b-\u200d\u2060\u034f\u00ad\ufeff]/g, "")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "");
}

// Where a mail client starts the quoted history in HTML. A marker line is put
// there before the HTML becomes text, so the text knows where the quote begins.
const MARK = "\u0001";
const HTML_QUOTE = /<(?:div|blockquote)\b[^>]*(?:class="[^"]*\b(?:gmail_quote|yahoo_quoted|moz-cite-prefix)\b[^"]*"|type="cite"|id="(?:divRplyFwdMsg|appendonsend|mail-editor-reference-message-container)")[^>]*>/i;

// The text of a message, with the addresses of its HTML links.
function body(payload) {
  const links = [];
  return { text: bodyText(payload, links), links };
}

function bodyText(payload, links) {
  const parts = flatten(payload);
  const inline = parts.filter((p) => !p.filename);
  const html = inline.find((p) => p.mimeType === "text/html" && p.body?.data);
  if (!html) {
    const plain = inline.find((p) => p.mimeType === "text/plain" && p.body?.data);
    return plain ? tidy(decode(plain).replace(/\r\n?/g, "\n")) : "";
  }
  const source = decode(html);
  const at = source.search(HTML_QUOTE);
  return htmlToText(at < 0 ? source : `${source.slice(0, at)}<p>${MARK}</p>${source.slice(at)}`, [], links);
}

// ---- Quoted history ----

const ATTR_START = /^(on|am|em|le|el|il|op)\s/i;
const ATTR_END = /(\b(wrote|escreveu|a écrit|escribió|ha scritto|schreef)\s*|\bschrieb\b.*):\s*$/i;
const HEADER_FROM = /^(from|de|von|van|da|od)\s*:\s*\S/i;
const HEADER_OTHER = /^(sent|date|to|cc|subject|enviad[oa]|data|para|assunto|gesendet|datum|an|betreff|envoyé|objet|à)\s*:/i;
const SEPARATOR = /^(-{2,}\s*(original message|mensagem original|ursprüngliche nachricht|message d'origine)\s*-*|_{10,})\s*$/i;
const FORWARD = /^(-+\s*(forwarded message|weitergeleitete nachricht|mensagem encaminhada|message transféré|mensaje reenviado)|begin forwarded message:)/i;

const isQuoteLine = (l) => /^\s*>/.test(l);

// How many lines an attribution ("On … wrote:") at i takes: 0, 1 or 2.
function attribution(lines, i) {
  if (!ATTR_START.test(lines[i])) return 0;
  if (ATTR_END.test(lines[i])) return 1;
  return i + 1 < lines.length && ATTR_END.test(lines[i + 1]) ? 2 : 0;
}

function headerBlock(lines, i) {
  if (!HEADER_FROM.test(lines[i])) return false;
  return lines.slice(i + 1, i + 6).filter((l) => HEADER_OTHER.test(l)).length >= 2;
}

const nextText = (lines, i) => {
  while (i < lines.length && !lines[i].trim()) i++;
  return lines[i];
};

// Splits a message's text into runs of new and quoted lines. The quoted history
// a client appends (after an attribution or a header block) runs to the end;
// quoted lines marked with ">" are quoted wherever they are, with the
// attribution right above them. Forwarded messages and messages that would be
// left with no new text stay whole.
function split(text) {
  let lines = text.split("\n");
  const quoted = new Array(lines.length).fill(false);
  const forward = lines.findIndex((l) => FORWARD.test(l));
  let cut = lines.indexOf(MARK);
  if (cut >= 0) {
    lines.splice(cut, 1);
    quoted.splice(cut, 1);
    while (cut < lines.length && !lines[cut].trim()) { lines.splice(cut, 1); quoted.splice(cut, 1); }
    const first = nextText(lines, cut);
    if (first && FORWARD.test(first)) cut = -1;
  }
  for (let i = 0; i < lines.length && (cut < 0 || i < cut); i++) {
    const span = attribution(lines, i);
    if ((span && !isQuoteLine(nextText(lines, i + span) ?? "")) || headerBlock(lines, i)) {
      cut = i > 0 && SEPARATOR.test(lines[i - 1]) ? i - 1 : i;
      break;
    }
  }
  if (forward >= 0 && (cut < 0 || forward < cut)) cut = -1;
  if (cut >= 0) quoted.fill(true, cut);
  for (let i = 0; i < lines.length; i++) {
    if (!isQuoteLine(lines[i])) continue;
    quoted[i] = true;
    let back = i - 1;
    while (back >= 0 && !lines[back].trim() && !quoted[back]) back--;
    if (back >= 0 && !quoted[back]) {
      const span = attribution(lines, back) ? 1 : back > 0 && attribution(lines, back - 1) === 2 ? 2 : 0;
      for (let k = back - span + 1; span && k <= i; k++) quoted[k] = true;
    }
    let next = i + 1;
    while (next < lines.length && !lines[next].trim()) next++;
    if (next < lines.length && isQuoteLine(lines[next])) quoted.fill(true, i, next);
  }
  if (lines.every((l, i) => quoted[i] || !l.trim())) quoted.fill(false);
  const segments = [];
  lines.forEach((l, i) => {
    const last = segments[segments.length - 1];
    if (last && last.quoted === quoted[i]) last.lines.push(l);
    else segments.push({ quoted: quoted[i], lines: [l] });
  });
  return { text: visible(lines.join("\n")), segments: segments.map((s) => ({ quoted: s.quoted, text: s.lines.join("\n") })) };
}

const flatten = (p) => [p, ...(p.parts ?? []).flatMap(flatten)];

export function readThread(raw) {
  const t = raw.thread;
  const messages = t.messages.map((m) => {
    const { text, links } = body(m.payload);
    return {
      ...split(text),
      links,
      id: m.id,
      from: header(m.payload.headers, "from"),
      to: header(m.payload.headers, "to"),
      date: header(m.payload.headers, "date"),
      unread: (m.labelIds ?? []).includes("UNREAD"),
      attachments: flatten(m.payload).filter((p) => p.filename).map((p) => p.filename),
    };
  });
  return { id: t.id, subject: t.messages.map((m) => header(m.payload.headers, "subject")).find(Boolean) || "(no subject)", messages };
}

// Wraps a line at cols, keeping where each piece starts in the line.
function wrap(line, cols) {
  if (line.length <= cols) return [{ text: line, start: 0 }];
  const out = [];
  let cur = null;
  let pos = 0;
  for (const raw of line.split(" ")) {
    let word = raw;
    let at = pos;
    pos += raw.length + 1;
    while (word.length > cols) {
      if (cur) { out.push(cur); cur = null; }
      out.push({ text: word.slice(0, cols), start: at });
      word = word.slice(cols);
      at += cols;
    }
    if (!cur) cur = { text: word, start: at };
    else if (cur.text.length + 1 + word.length <= cols) cur.text += ` ${word}`;
    else { out.push(cur); cur = { text: word, start: at }; }
  }
  out.push(cur ?? { text: "", start: pos });
  return out;
}

const ADDRESS = /https?:\/\/[^\s)>\]]+/g;

// Takes the link markers out of a line, returning its visible text and where
// each link is in it: labelled HTML links and addresses written out.
function linkSpans(line, urls) {
  let plain = "";
  const spans = [];
  let last = 0;
  let open = null;
  for (const m of line.matchAll(/\u0004(\d+)\u0005|\u0006/g)) {
    plain += line.slice(last, m.index);
    last = m.index + m[0].length;
    if (m[1] !== undefined) open = { start: plain.length, url: urls[Number(m[1])] };
    else if (open) { spans.push({ start: open.start, end: plain.length, url: open.url }); open = null; }
  }
  plain += line.slice(last);
  for (const u of plain.matchAll(ADDRESS)) {
    const start = u.index;
    const end = start + u[0].length;
    if (!spans.some((x) => x.start < end && x.end > start)) spans.push({ start, end, url: u[0] });
  }
  return { plain, spans: spans.sort((a, b) => a.start - b.start) };
}

// Splits a line into rows. Each row lists the links it shows as
// [start, end, url], start and end being positions in the row's text.
function rowsOf(line, cols, kind, message, urls) {
  const { plain, spans } = linkSpans(line, urls);
  if (kind === "text" && LINK.test(plain)) kind = "link";
  return wrap(plain, cols).map(({ text, start }) => {
    const end = start + text.length;
    const links = spans.filter((x) => x.start < end && x.end > start)
      .map((x) => [Math.max(0, x.start - start), Math.min(text.length, x.end - start), x.url]);
    return { kind, message, text, links };
  });
}

const LINK = /^\s*\(?https?:\/\/\S+\)?\s*$/;

// Rows for the reading pane. Quoted history is one "quoted" row per run unless
// the message's index is in expanded, then its lines come as "quote" rows.
export function lines(thread, cols, expanded = new Set()) {
  return thread.messages.flatMap((m, i) => [
    { kind: "header", message: i, text: m.from },
    ...(m.segments ?? [{ quoted: false, text: m.text }]).flatMap((s) => {
      const rows = s.text.split("\n");
      if (s.quoted && !expanded.has(i)) return [{ kind: "quoted", message: i, text: `${rows.length} quoted line${rows.length === 1 ? "" : "s"}` }];
      return rows.flatMap((l) => {
        if (l.startsWith(HEADING)) return rowsOf(l.slice(1), cols, s.quoted ? "quote" : "heading", i, m.links ?? []);
        return rowsOf(l, cols, s.quoted ? "quote" : "text", i, m.links ?? []);
      });
    }),
    ...m.attachments.map((text) => ({ kind: "attachment", message: i, text })),
    { kind: "text", message: i, text: "" },
  ]);
}
