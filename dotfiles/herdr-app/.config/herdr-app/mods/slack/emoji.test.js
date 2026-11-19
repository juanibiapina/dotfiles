import { test } from "node:test";
import assert from "node:assert/strict";
import { emoji, findEmoji } from "./emoji.js";
import { CATEGORIES, COUNTRIES } from "./emoji-data.js";

const graphemes = (text) => [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)].length;

test("emoji draws names and aliases, and leaves unknown names as codes", () => {
  assert.equal(emoji("+1"), "👍");
  assert.equal(emoji("thumbsup"), "👍");
  assert.equal(emoji("uk"), "🇬🇧");
  assert.equal(emoji("flag-jp"), "🇯🇵");
  assert.equal(emoji("wave::skin-tone-3"), "👋");
  assert.equal(emoji("glitch_crab"), ":glitch_crab:");
});

test("findEmoji finds an emoji by any alias, under its canonical name", () => {
  assert.equal(findEmoji("thumbsup")[0], "+1");
  assert.equal(findEmoji("thumbsup").length, 1);
});

test("findEmoji ranks exact, then prefix, then substring matches, each emoji once", () => {
  const hits = findEmoji("heart");
  assert.equal(hits[0], "heart");
  const lastPrefix = hits.findLastIndex((n) => n.startsWith("heart"));
  const firstInner = hits.findIndex((n) => !n.startsWith("heart"));
  assert.ok(lastPrefix < firstInner, `${hits[lastPrefix]} comes after ${hits[firstInner]}`);
  assert.equal(new Set(hits).size, hits.length);
});

test("the catalog fits every Jev question under 255 options", () => {
  assert.ok(CATEGORIES.length <= 255);
  for (const c of CATEGORIES) assert.ok(c.emoji.length <= 255, c.label);
  assert.ok(Math.ceil(COUNTRIES.length / 2) + 1 <= 255);
});

test("the catalog has unique names and labels, and single-grapheme emoji", () => {
  const all = [...CATEGORIES.flatMap((c) => c.emoji), ...COUNTRIES];
  const names = all.flatMap((e) => e.names);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(CATEGORIES.map((c) => c.label)).size, CATEGORIES.length);
  assert.equal(new Set(COUNTRIES.map((c) => c.label)).size, COUNTRIES.length);
  for (const e of all) assert.equal(graphemes(e.char), 1, e.names[0]);
});
