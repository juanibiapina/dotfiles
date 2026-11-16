import { test } from "node:test";
import assert from "node:assert/strict";
import { readThread, lines } from "./message.js";

const encode = (bytes) => Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function part(mimeType, text, { charset = "utf-8", filename } = {}) {
  const bytes = charset === "iso-8859-1" ? Buffer.from(text, "latin1") : Buffer.from(text, "utf8");
  return {
    mimeType,
    filename: filename ?? "",
    headers: [{ name: "Content-Type", value: `${mimeType}; charset="${charset}"` }],
    body: filename ? { attachmentId: "att", size: bytes.length } : { data: encode(bytes), size: bytes.length },
  };
}

const multipart = (mimeType, ...parts) => ({ mimeType, filename: "", headers: [{ name: "Content-Type", value: mimeType }], body: { size: 0 }, parts });

function message(payload, { id = "m1", from = "Ana <ana@example.com>", subject = "Hello", labels = ["INBOX"], date = "Mon, 16 Nov 2026 12:51:17 +0100" } = {}) {
  const headers = [];
  if (from) headers.push({ name: "From", value: from });
  headers.push({ name: "To", value: "me@example.com" });
  if (subject) headers.push({ name: "Subject", value: subject });
  if (date) headers.push({ name: "Date", value: date });
  return { id, threadId: "t1", labelIds: labels, payload: { ...payload, headers: [...headers, ...payload.headers] } };
}

const thread = (...messages) => ({ thread: { id: "t1", messages } });

test("reads a plain text message", () => {
  const t = readThread(thread(message(part("text/plain", "Hi there,\nsee you."))));
  assert.equal(t.subject, "Hello");
  assert.equal(t.messages.length, 1);
  assert.equal(t.messages[0].from, "Ana <ana@example.com>");
  assert.equal(t.messages[0].text, "Hi there,\nsee you.");
});

test("prefers the HTML part of a multipart/alternative message, as Gmail shows it", () => {
  const t = readThread(thread(message(multipart("multipart/alternative", part("text/plain", "Plain words"), part("text/html", "<p>Html words</p>")))));
  assert.equal(t.messages[0].text, "Html words");
});

test("turns an HTML message into text with line breaks and link addresses", () => {
  const html = `<html><head><style>p { color: red }</style><title>x</title></head><body>
    <h1>Your  order</h1>
    <p>Tom &amp; Jerry&nbsp;say &quot;hi&quot; &#8212; thanks&#x21;</p>
    <p>Track it <a href="https://example.com/t?a=1&amp;b=2">here</a>.<br>Bye</p>
    <table><tr><td>Item</td><td>1</td></tr></table>
    <script>alert(1)</script>
  </body></html>`;
  const t = readThread(thread(message(part("text/html", html))));
  assert.equal(t.messages[0].text, [
    "Your order",
    "",
    'Tom & Jerry say "hi" — thanks!',
    "",
    "Track it here.",
    "Bye",
    "",
    "Item  1",
  ].join("\n"));
});

test("lists attachments by name and reads the text beside them", () => {
  const t = readThread(thread(message(multipart("multipart/mixed",
    multipart("multipart/alternative", part("text/plain", "See the letter."), part("text/html", "<p>See the letter.</p>")),
    part("application/pdf", "%PDF", { filename: "Letter.pdf" }),
    part("text/plain", "attached notes", { filename: "notes.txt" })))));
  assert.equal(t.messages[0].text, "See the letter.");
  assert.deepEqual(t.messages[0].attachments, ["Letter.pdf", "notes.txt"]);
});

test("decodes UTF-8 and Latin-1 text", () => {
  const t = readThread(thread(
    message(part("text/plain", "Grüße, café ✓"), { id: "m1" }),
    message(part("text/plain", "Grüße, café", { charset: "iso-8859-1" }), { id: "m2" }),
  ));
  assert.deepEqual(t.messages.map((m) => m.text), ["Grüße, café ✓", "Grüße, café"]);
});

test("keeps message order, marks unread messages and survives missing headers", () => {
  const t = readThread(thread(
    message(part("text/plain", "first"), { id: "m1", subject: null, from: null, date: null }),
    message(part("text/plain", "second"), { id: "m2", subject: null, labels: ["INBOX", "UNREAD"] }),
  ));
  assert.equal(t.subject, "(no subject)");
  assert.deepEqual(t.messages.map((m) => [m.id, m.from, m.unread]), [["m1", "", false], ["m2", "Ana <ana@example.com>", true]]);
  assert.equal(t.messages[1].date, "Mon, 16 Nov 2026 12:51:17 +0100");
  assert.equal(t.messages[1].to, "me@example.com");
});

test("lines wraps each message under a header row, with attachments and a gap between messages", () => {
  const t = readThread(thread(
    message(part("text/plain", "aaa bbb ccc dddddddddddd\n\nend"), { id: "m1" }),
    message(multipart("multipart/mixed", part("text/plain", "ok"), part("application/pdf", "%PDF", { filename: "a.pdf" })), { id: "m2", from: "Bo <bo@example.com>" }),
  ));
  assert.deepEqual(lines(t, 10).map((l) => [l.kind, l.message, l.text]), [
    ["header", 0, "Ana <ana@example.com>"],
    ["text", 0, "aaa bbb"],
    ["text", 0, "ccc"],
    ["text", 0, "dddddddddd"],
    ["text", 0, "dd"],
    ["text", 0, ""],
    ["text", 0, "end"],
    ["text", 0, ""],
    ["header", 1, "Bo <bo@example.com>"],
    ["text", 1, "ok"],
    ["attachment", 1, "a.pdf"],
    ["text", 1, ""],
  ]);
});

test("plain text with CRLF line endings reads as lines", () => {
  const t = readThread(thread(message(part("text/plain", "one\r\ntwo  \r\n\r\n\r\n\r\nthree\r\n"))));
  assert.equal(t.messages[0].text, "one\ntwo\n\nthree");
});

test("plain text keeps its indentation", () => {
  const t = readThread(thread(message(part("text/plain", "Total:\n    Item     1\n> quoted"))));
  assert.equal(t.messages[0].text, "Total:\n    Item     1\n> quoted");
});

test("decodes accented letters written as named entities", () => {
  const t = readThread(thread(message(part("text/html", "<p>Certid&atilde;o &Ccedil;&Atilde; caf&eacute; 4&ordf; &laquo;ok&raquo; &szlig;</p>"))));
  assert.equal(t.messages[0].text, "Certidão ÇÃ café 4ª «ok» ß");
});

test("lines marks every row of a wrapped link as a link", () => {
  const t = readThread(thread(message(part("text/plain", "Track:\nhttps://example.com/abcdefghij\n(https://x.io/a)"))));
  assert.deepEqual(lines(t, 12).slice(1, -1).map((l) => [l.kind, l.text]), [
    ["text", "Track:"],
    ["link", "https://exam"],
    ["link", "ple.com/abcd"],
    ["link", "efghij"],
    ["link", "(https://x.i"],
    ["link", "o/a)"],
  ]);
});

const shown = (t, cols = 200, expanded) => lines(t, cols, expanded).slice(1, -1).map((l) => (l.kind === "text" ? l.text : `[${l.kind}] ${l.text}`));

test("hides a quoted reply under one collapsed row", () => {
  const t = readThread(thread(message(part("text/plain", "Sounds good.\n\nOn Tue, Nov 10, 2026 at 4:06 PM Ana <ana@example.com> wrote:\n> Shall we meet?\n>\n> Ana"))));
  assert.deepEqual(shown(t), ["Sounds good.", "", "[quoted] 4 quoted lines"]);
});

test("shows the quoted lines when the message is expanded", () => {
  const t = readThread(thread(message(part("text/plain", "Sounds good.\n\nOn Tue, Nov 10, 2026 at 4:06 PM Ana <ana@example.com> wrote:\n> Shall we meet?"))));
  assert.deepEqual(shown(t, 200, new Set([0])), ["Sounds good.", "", "[quote] On Tue, Nov 10, 2026 at 4:06 PM Ana <ana@example.com> wrote:", "[quote] > Shall we meet?"]);
});

test("keeps a signature written after the quote", () => {
  const t = readThread(thread(message(part("text/plain", "Gern.\n\nAm 05.11.2026 um 18:36 schrieb Bo <bo@example.com>:\n> Ein Termin?\n> Bo\n\n--\nPraxis"))));
  assert.deepEqual(shown(t), ["Gern.", "", "[quoted] 3 quoted lines", "", "--", "Praxis"]);
});

test("keeps replies written between quotes", () => {
  const t = readThread(thread(message(part("text/plain", "> First question?\nYes.\n> Second question?\nNo."))));
  assert.deepEqual(shown(t), ["[quoted] 1 quoted line", "Yes.", "[quoted] 1 quoted line", "No."]);
});

test("trims Gmail's quoted HTML", () => {
  const html = '<div dir="ltr">Thanks!</div><br><div class="gmail_quote"><div class="gmail_attr">On Mon, Ana wrote:<br></div><blockquote class="gmail_quote"><p>Here it is</p></blockquote></div>';
  const t = readThread(thread(message(part("text/html", html))));
  assert.deepEqual(shown(t), ["Thanks!", "", "[quoted] 3 quoted lines"]);
});

test("trims an Outlook-style header block and everything below it", () => {
  const html = "<p>Claro, qualquer pessoa pode trazer.</p><p>Ricardo</p><hr /><p>De: me@example.com<br>Enviada: 2026/11/13 14:41:22<br>Para: ricardo@example.com<br>Assunto: RE: Documentos</p><p>Bom dia, pergunta?</p>";
  const t = readThread(thread(message(part("text/html", html))));
  assert.deepEqual(shown(t), ["Claro, qualquer pessoa pode trazer.", "", "Ricardo", "", "[quoted] 6 quoted lines"]);
});

test("never trims a forwarded message", () => {
  const text = "FYI\n\n---------- Forwarded message ---------\nFrom: Ana <ana@example.com>\nDate: Mon, Nov 9\nSubject: Plan\nTo: me@example.com\n\nThe plan.";
  const t = readThread(thread(message(part("text/plain", text))));
  assert.deepEqual(shown(t), text.split("\n"));
});

test("never trims a message down to nothing", () => {
  const t = readThread(thread(message(part("text/plain", "On Mon, Ana wrote:\n> only a quote"))));
  assert.deepEqual(shown(t), ["On Mon, Ana wrote:", "> only a quote"]);
});

const html = (h) => readThread(thread(message(part("text/html", h))));

test("a table of short cells becomes aligned columns", () => {
  const t = html("<p>Order</p><table><tr><td>Auftragsnummer:</td><td>346665755</td></tr><tr><td>Datum:</td><td>13.11.2026</td></tr></table><p>Bye</p>");
  assert.equal(t.messages[0].text, "Order\n\nAuftragsnummer:  346665755\nDatum:           13.11.2026\n\nBye");
});

test("a layout table becomes paragraphs", () => {
  const long = "This is a long paragraph of a newsletter that sits in a layout table cell, much longer than any column.";
  const t = html(`<table><tr><td><table><tr><td>${long}</td></tr><tr><td>Second block</td></tr></table></td></tr></table>`);
  assert.equal(t.messages[0].text, `${long}\nSecond block`);
});

test("a data table inside a layout table keeps its columns", () => {
  const t = html("<table><tr><td><p>Your items</p><table><tr><th>Qty</th><th>Item</th></tr><tr><td>1</td><td>Router</td></tr></table></td></tr></table>");
  assert.equal(t.messages[0].text, "Your items\n\nQty  Item\n1    Router");
});

test("headings come as heading rows", () => {
  const t = html("<h2>Your  order</h2><p>Thanks</p>");
  assert.equal(t.messages[0].text, "Your order\n\nThanks");
  assert.deepEqual(lines(t, 78).slice(1, 3).map((l) => [l.kind, l.text]), [["heading", "Your order"], ["text", ""]]);
});

test("rows know the links they show, also when one wraps", () => {
  const t = readThread(thread(message(part("text/plain", "See https://example.com/abcdefghij here\nhttps://x.io/averylongpath"))));
  const rows = lines(t, 16).slice(1, -1).map((l) => [l.text, l.links]);
  assert.deepEqual(rows, [
    ["See", []],
    ["https://example.", [[0, 16, "https://example.com/abcdefghij"]]],
    ["com/abcdefghij", [[0, 14, "https://example.com/abcdefghij"]]],
    ["here", []],
    ["https://x.io/ave", [[0, 16, "https://x.io/averylongpath"]]],
    ["rylongpath", [[0, 10, "https://x.io/averylongpath"]]],
  ]);
});

test("a row with an address inside text marks where it is", () => {
  const t = readThread(thread(message(part("text/plain", "Track it here (https://t.co/x)."))));
  const [row] = lines(t, 78).slice(1, 2);
  assert.deepEqual(row.links, [[15, 29, "https://t.co/x"]]);
});

test("an HTML link shows its label and keeps its address behind it", () => {
  const t = html('<p>Please <a href="https://cal.example/add?x=1&amp;y=2">add to calendar</a> or <a href="https://x.io">https://x.io</a>.</p>');
  assert.equal(t.messages[0].text, "Please add to calendar or https://x.io.");
  const [row] = lines(t, 78).slice(1, 2);
  assert.equal(row.text, "Please add to calendar or https://x.io.");
  assert.deepEqual(row.links, [[7, 22, "https://cal.example/add?x=1&y=2"], [26, 38, "https://x.io"]]);
});

test("a link label in a table cell keeps the columns aligned", () => {
  const t = html('<table><tr><td><a href="https://a.io">Track</a>:</td><td>yes</td></tr><tr><td>Order number:</td><td>42</td></tr></table>');
  assert.equal(t.messages[0].text, "Track:         yes\nOrder number:  42");
});
