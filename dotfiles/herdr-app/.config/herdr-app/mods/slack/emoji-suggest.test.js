import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestEmoji, typesafeDecide } from "./emoji-suggest.js";
import { CATEGORIES } from "./emoji-data.js";

const purpose = { context: "Juan is reacting to a Slack message with an emoji.", subject: "message" };

const labelIn = (instructions) => String(instructions).match(/"([^"]+)" be a fitting/)?.[1] ?? "";

// A decide that answers the category request from script.categories,
// script.country and script.mainSubject, and each fit question from
// script.fit by the emoji's label. It records every request.
const scripted = (script) => {
  const requests = [];
  const decide = async (request) => {
    requests.push(request);
    const answers = {};
    if ("categories" in request.questions) {
      const probabilities = Object.fromEntries(CATEGORIES.map((c) => [c.label, script.categories[c.label] ?? 0]));
      answers.categories = { type: "choice", choice: "", probabilities, confidence: 1 };
      answers.categoriesReversed = { type: "choice", choice: "", probabilities, confidence: 1 };
      for (const id of ["country0", "country1"]) {
        const options = Object.keys(request.questions[id].criteria);
        answers[id] = { type: "choice", choice: "", probabilities: Object.fromEntries(options.map((o) => [o, script.country?.[o] ?? 0])), confidence: 1 };
      }
      answers.mainSubject = { type: "noul", noul: script.mainSubject ?? 0 };
    } else {
      for (const [id, question] of Object.entries(request.questions)) {
        answers[id] = { type: "noul", noul: script.fit[labelIn(question.instructions)] ?? 0.01 };
      }
    }
    return { answers };
  };
  decide.requests = requests;
  return decide;
};

const dogs = {
  categories: { "animal: mammal": 0.9, "animal: bird": 0.1 },
  fit: { "dog face": 0.95, dog: 0.9, "paw prints": 0.8, poodle: 0.7, "guide dog": 0.6, "service dog": 0.5, "cat face": 0.4 },
};

test("ranks the emoji that fit at least 0.8 by fit, under their Slack names", async () => {
  const names = await suggestEmoji(scripted(dogs), { text: "Got a dog!", purpose });
  assert.deepEqual(names, ["dog", "dog2", "feet"]);
});

test("stops at 12 emoji", async () => {
  const fit = Object.fromEntries(CATEGORIES.find((c) => c.label === "animal: mammal").emoji.map((e) => [e.label, 0.9]));
  const names = await suggestEmoji(scripted({ categories: dogs.categories, fit }), { text: "Zoo trip", purpose });
  assert.equal(names.length, 12);
});

test("stops at the cap", async () => {
  assert.deepEqual(await suggestEmoji(scripted(dogs), { text: "Got a dog!", purpose, cap: 2 }), ["dog", "dog2"]);
});

test("asks fit questions only for emoji in the top eight categories", async () => {
  const categories = Object.fromEntries(CATEGORIES.slice(0, 9).map((c, i) => [c.label, 0.9 - i * 0.1]));
  const decide = scripted({ categories, fit: {} });
  await suggestEmoji(decide, { text: "x", purpose });
  const asked = Object.values(decide.requests[1].questions).map((q) => labelIn(q.instructions));
  const expected = CATEGORIES.slice(0, 8).flatMap((c) => c.emoji.map((e) => e.label));
  assert.deepEqual(asked.sort(), expected.sort());
});

test("keeps one emoji per variant family", async () => {
  const decide = scripted({
    categories: { "person: gesture": 0.9 },
    fit: { "person facepalming": 0.99, "man facepalming": 0.98, "woman facepalming": 0.97, "person shrugging": 0.85 },
  });
  assert.deepEqual(await suggestEmoji(decide, { text: "CI broke again", purpose }), ["face_palm", "shrug"]);
});

test("puts the country's flag first when the place is the main subject", async () => {
  const decide = scripted({ ...dogs, country: { Croatia: 0.99 }, mainSubject: 0.8 });
  assert.deepEqual(await suggestEmoji(decide, { text: "Croatia trip", purpose }), ["flag-hr", "dog", "dog2", "feet"]);
  assert.deepEqual(await suggestEmoji(decide, { text: "Croatia trip", purpose, cap: 2 }), ["flag-hr", "dog"]);
});

test("puts the country's flag last when the place is incidental", async () => {
  const decide = scripted({ ...dogs, country: { Japan: 0.9 }, mainSubject: 0.1 });
  assert.deepEqual(await suggestEmoji(decide, { text: "Tokyo marathon", purpose }), ["dog", "dog2", "feet", "jp"]);
  assert.deepEqual(await suggestEmoji(decide, { text: "Tokyo marathon", purpose, cap: 2 }), ["dog", "jp"]);
});

test("reaches flags in both halves of the country list", async () => {
  for (const [country, flag] of [["Austria", "flag-at"], ["Zimbabwe", "flag-zw"], ["Scotland", "flag-scotland"]]) {
    const decide = scripted({ ...dogs, country: { [country]: 0.9 }, mainSubject: 0.9 });
    assert.equal((await suggestEmoji(decide, { text: country, purpose }))[0], flag);
  }
});

test("adds no flag when no country is likely enough", async () => {
  const decide = scripted({ ...dogs, country: { Croatia: 0.4, "none of these": 0.6 }, mainSubject: 0.9 });
  assert.ok(!(await suggestEmoji(decide, { text: "Got a dog!", purpose })).includes("flag-hr"));
});

test("blank text asks nothing", async () => {
  const decide = async () => assert.fail("decide was called");
  assert.deepEqual(await suggestEmoji(decide, { text: "  ", purpose }), []);
});

test("rejects when a request fails or Jev gives no categories", async () => {
  const failing = async () => { throw new Error("TypeSafe answered 500"); };
  await assert.rejects(suggestEmoji(failing, { text: "hi", purpose }), /500/);
  await assert.rejects(suggestEmoji(async () => ({ answers: {} }), { text: "hi", purpose }), /no categories/);
});

test("the message is the state of both requests, and the purpose reaches every question", async () => {
  const decide = scripted(dogs);
  await suggestEmoji(decide, { text: "Got a dog!", purpose });
  assert.equal(decide.requests.length, 2);
  for (const request of decide.requests) {
    assert.deepEqual(request.state, { message: { text: "Got a dog!" } });
    for (const question of Object.values(request.questions)) {
      if (question.type === "noul" && question.instructions.startsWith("Is a country")) continue;
      assert.ok(JSON.stringify(question.instructions).includes(purpose.context));
    }
  }
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
