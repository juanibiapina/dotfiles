// Suggests emoji for a text: TypeSafe's Jev answers, for each emoji the caller
// offers, how likely it fits, and the best ones come back by name. Ported from
// zero's @zeroapps/emoji-suggest, which picks from all of Unicode in two steps;
// here the caller's list is small enough for one request. Imports nothing
// from "herdr", so `node --test` runs it.

const TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = "jev-1.14.0";

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

const fitQuestion = (purpose, { name, char }) => ({
  type: "noul",
  instructions: `${purpose.context} Would the emoji ${char} "${name.replace(/_/g, " ")}" be a fitting reaction to the ${purpose.subject} in \`${purpose.subject}\`?`,
  criteria: {
    true: `The emoji fits what the ${purpose.subject} says or how it feels.`,
    false: `The emoji is unrelated to the ${purpose.subject}, or would read wrong as a reaction to it.`,
  },
});

// Picks up to `count` of `choices` that fit `text`, best first.
// choices: [{ name, char }]: the caller's id for the emoji (a Slack name) and
// the emoji itself. purpose: { context, subject }, as in zero: what the emoji
// is for, and what to call the text. Resolves with names; [] for blank text.
// Rejects when `decide` fails.
export async function suggestEmoji(decide, { text, choices, purpose, count = 6 }) {
  if (!text?.trim()) return [];
  const questions = Object.fromEntries(choices.map((c, i) => [`e${i}`, fitQuestion(purpose, c)]));
  const response = await decide({ state: { [purpose.subject]: { text } }, questions });
  return choices
    .map((c, i) => ({ name: c.name, fit: response?.answers?.[`e${i}`]?.noul }))
    .filter((c) => typeof c.fit === "number")
    .sort((a, b) => b.fit - a.fit)
    .slice(0, count)
    .map((c) => c.name);
}
