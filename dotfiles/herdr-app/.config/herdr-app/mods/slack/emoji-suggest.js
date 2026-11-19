// Suggests emoji reactions for a text from every standard Slack emoji, in two
// TypeSafe Jev requests, ported from zero's @zeroapps/emoji-suggest. The first
// asks which Unicode subgroups hold fitting emoji, and which country the text
// is about; the second asks, for each emoji in the best subgroups, how likely
// it fits. Imports nothing from "herdr", so `node --test` runs it.
import { CATEGORIES, COUNTRIES } from "./emoji-data.js";

const TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = "jev-1.14.0";

const MIN_FIT = 0.8;
const MAX_SUGGESTIONS = 12;
const CANDIDATE_CATEGORIES = 8;
const COUNTRY_THRESHOLD = 0.5;
const MAIN_SUBJECT_THRESHOLD = 0.5;

const NONE = "none of these";
const VARIANT_WORDS = /\b(man|woman|men|women|person|people|boy|girl|adult|child|older)\b/g;
// A choice takes at most 255 options, so the countries are asked in two halves.
const COUNTRY_HALVES = [
  COUNTRIES.slice(0, Math.ceil(COUNTRIES.length / 2)),
  COUNTRIES.slice(Math.ceil(COUNTRIES.length / 2)),
];

// One Jev call: (request) => Promise<response>, TypeSafe's /v1/systemone shape.
export function typesafeDecide(apiKey, fetchImpl = fetch) {
  return async (request) => {
    const r = await fetchImpl(TYPESAFE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: JEV_MODEL, ...request }),
    });
    if (!r.ok) throw new Error(`TypeSafe answered ${r.status}`);
    return r.json();
  };
}

const sample = (emoji, n = 10) =>
  emoji.length <= n
    ? emoji.map((e) => e.label)
    : Array.from({ length: n }, (_, i) => emoji[Math.floor((i * emoji.length) / n)].label);

const categoryQuestion = (purpose, categories) => ({
  type: "choice",
  instructions: {
    context: `${purpose.context} Each option is a category of emoji, with example emoji names.`,
    question: `Which category holds the emoji that would be the most fitting reaction to the ${purpose.subject} in \`${purpose.subject}\`?`,
  },
  criteria: Object.fromEntries(categories.map((c) => [c.label, `For example: ${sample(c.emoji).join(", ")}`])),
});

const countryQuestion = (purpose, countries) => ({
  type: "choice",
  instructions: {
    context: `${purpose.context} The ${purpose.subject} is about a country when it names the country, a city or region in it, its people, or its language, for example a trip there, a move there, family there, or learning its language.`,
    question: `Which country or region is the ${purpose.subject} in \`${purpose.subject}\` about?`,
  },
  criteria: {
    ...Object.fromEntries(countries.map((c) => [c.label, null])),
    [NONE]: `The ${purpose.subject} is not about any of the listed countries or regions.`,
  },
});

const mainSubjectQuestion = (purpose) => ({
  type: "noul",
  instructions: `Is a country or place the main subject of the ${purpose.subject} in \`${purpose.subject}\`?`,
  criteria: {
    true: `The ${purpose.subject} is mainly about the place itself: traveling there, moving there, or learning its language or culture.`,
    false: `The place is only where it happens, or no place is named. The main subject is something else, such as an event, an activity, a purchase, or people.`,
  },
});

const fitQuestion = (purpose, { char, label }) => ({
  type: "noul",
  instructions: `${purpose.context} Would the emoji ${char} "${label}" be a fitting reaction to the ${purpose.subject} in \`${purpose.subject}\`?`,
  criteria: {
    true: `The emoji fits what the ${purpose.subject} says or how it feels.`,
    false: `The emoji is unrelated to the ${purpose.subject}, or would read wrong as a reaction to it.`,
  },
});

// "man facepalming", "woman facepalming" and "person facepalming" are one family.
const family = (label) =>
  label.split(":")[0].replace(VARIANT_WORDS, "").replace(/facing right/g, "").replace(/\s+/g, " ").trim();

const choiceProbabilities = (response, id) => {
  const answer = response?.answers?.[id];
  return answer?.type === "choice" && answer.probabilities ? answer.probabilities : null;
};

const noulValue = (response, id) => {
  const answer = response?.answers?.[id];
  return answer?.type === "noul" && typeof answer.noul === "number" ? answer.noul : null;
};

const detectCountry = (response) => {
  let best = null;
  COUNTRY_HALVES.forEach((half, i) => {
    const probabilities = choiceProbabilities(response, `country${i}`);
    if (!probabilities) return;
    for (const country of half) {
      const p = probabilities[country.label] ?? 0;
      if (!best || p > best.p) best = { name: country.names[0], p };
    }
  });
  if (!best || best.p < COUNTRY_THRESHOLD) return null;
  return { name: best.name, mainSubject: (noulValue(response, "mainSubject") ?? 0) >= MAIN_SUBJECT_THRESHOLD };
};

const placeFlag = (names, flag, cap) => {
  if (!flag) return names.slice(0, cap);
  if (flag.mainSubject) return [flag.name, ...names].slice(0, cap);
  return [...names.slice(0, cap - 1), flag.name];
};

// The Slack emoji names whose fit for `text` as a reaction is at least
// MIN_FIT, one per variant family, best first, at most `cap` of them; the
// flag of the country the text is about counts toward the cap.
// purpose: { context, subject }, as in zero: what the emoji is for, and what
// to call the text. [] for blank text, without a request. Rejects when a
// request fails or Jev's first answer has no category probabilities.
export async function suggestEmoji(decide, { text, purpose, cap = MAX_SUGGESTIONS }) {
  if (!text?.trim()) return [];
  const state = { [purpose.subject]: { text } };
  const first = await decide({
    state,
    questions: {
      categories: categoryQuestion(purpose, CATEGORIES),
      categoriesReversed: categoryQuestion(purpose, [...CATEGORIES].reverse()),
      country0: countryQuestion(purpose, COUNTRY_HALVES[0]),
      country1: countryQuestion(purpose, COUNTRY_HALVES[1]),
      mainSubject: mainSubjectQuestion(purpose),
    },
  });
  const forward = choiceProbabilities(first, "categories");
  const reversed = choiceProbabilities(first, "categoriesReversed");
  if (!forward || !reversed) throw new Error("Jev gave no categories");
  // Asking in both orders evens out a bias toward the first options.
  const score = (c) => ((forward[c.label] ?? 0) + (reversed[c.label] ?? 0)) / 2;
  const candidates = [...CATEGORIES]
    .sort((a, b) => score(b) - score(a))
    .slice(0, CANDIDATE_CATEGORIES)
    .flatMap((c) => c.emoji);

  const questions = Object.fromEntries(candidates.map((e, i) => [`e${i}`, fitQuestion(purpose, e)]));
  const second = await decide({ state, questions });

  const scored = candidates
    .map((e, i) => ({ ...e, fit: noulValue(second, `e${i}`) }))
    .filter((e) => e.fit !== null && e.fit >= MIN_FIT)
    .sort((a, b) => b.fit - a.fit);
  const seen = new Set();
  const ranked = [];
  for (const e of scored) {
    const key = family(e.label);
    if (seen.has(key)) continue;
    seen.add(key);
    ranked.push(e.names[0]);
    if (ranked.length >= cap) break;
  }
  return placeFlag(ranked, detectCountry(first), cap);
}
