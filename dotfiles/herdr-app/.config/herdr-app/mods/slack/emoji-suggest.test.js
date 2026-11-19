import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestEmoji, typesafeDecide } from "./emoji-suggest.js";

const choices = [{ name: "tada", char: "🎉" }, { name: "bug", char: "🐛" }, { name: "pizza", char: "🍕" }, { name: "x", char: "❌" }];
const purpose = { context: "Juan is reacting to a Slack message with an emoji.", subject: "message" };

test("one request asks about every choice, and the best fits come back by name", async () => {
  const requests = [];
  const decide = async (request) => {
    requests.push(request);
    return { answers: { e0: { type: "noul", noul: 0.2 }, e1: { type: "noul", noul: 0.9 }, e3: { type: "noul", noul: 0.6 } } };
  };
  const names = await suggestEmoji(decide, { text: "CI is failing again", choices, purpose, count: 2 });
  assert.deepEqual(names, ["bug", "x"]);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].state, { message: { text: "CI is failing again" } });
  assert.equal(Object.keys(requests[0].questions).length, choices.length);
});

test("a choice without an answer is left out", async () => {
  const decide = async () => ({ answers: { e2: { type: "noul", noul: 0.8 } } });
  assert.deepEqual(await suggestEmoji(decide, { text: "pizza?", choices, purpose }), ["pizza"]);
});

test("blank text asks nothing", async () => {
  const decide = async () => assert.fail("decide was called");
  assert.deepEqual(await suggestEmoji(decide, { text: "  ", choices, purpose }), []);
});

test("a failed decide rejects", async () => {
  const decide = async () => { throw new Error("TypeSafe answered 500"); };
  await assert.rejects(suggestEmoji(decide, { text: "hi", choices, purpose }), /500/);
});

test("typesafeDecide posts to Jev with the key and the pinned model", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ answers: {} }) };
  };
  const request = { state: { message: { text: "hi" } }, questions: {} };
  assert.deepEqual(await typesafeDecide("key", fetchImpl)(request), { answers: {} });
  assert.equal(calls[0].url, "https://api.typesafe.ai/v1/systemone");
  assert.equal(calls[0].init.headers.Authorization, "Bearer key");
  assert.deepEqual(JSON.parse(calls[0].init.body), { model: "jev-1.14.0", ...request });
});

test("typesafeDecide rejects with the status", async () => {
  const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({}) });
  await assert.rejects(typesafeDecide("key", fetchImpl)({ state: {}, questions: {} }), /429/);
});
