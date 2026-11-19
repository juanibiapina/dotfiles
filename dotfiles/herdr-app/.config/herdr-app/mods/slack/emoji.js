// Looks up standard Slack emoji by name, from the generated catalog in
// emoji-data.js. Imports nothing from "herdr", so `node --test` runs it.
import { CATEGORIES, COUNTRIES } from "./emoji-data.js";

const ALL = [...CATEGORIES.flatMap((c) => c.emoji), ...COUNTRIES];
const CHARS = new Map(ALL.flatMap((e) => e.names.map((name) => [name, e.char])));

// The emoji for a Slack name or alias, ignoring a skin tone suffix; `:name:`
// for a name the catalog lacks, such as a workspace's custom emoji.
export function emoji(name) {
  return CHARS.get(name.replace(/::skin-tone-\d$/, "")) ?? `:${name}:`;
}

// The canonical names of the emoji with a name or alias containing `query`,
// each emoji once: exact matches, then names starting with it, then the rest,
// in catalog order within each.
export function findEmoji(query) {
  const tiers = [[], [], []];
  for (const e of ALL) {
    const tier = Math.min(...e.names.map((n) => (n === query ? 0 : n.startsWith(query) ? 1 : n.includes(query) ? 2 : 3)));
    if (tier < 3) tiers[tier].push(e.names[0]);
  }
  return tiers.flat();
}
