// Turns Slack's mrkdwn into the markdown TextView draws: mentions and channel
// links get names, links keep their labels, *bold* and _italic_ change syntax,
// every newline stays a line break, and emoji codes become emoji.
// Imports nothing from "herdr", so `node --test` runs it.
import { emoji } from "./emoji.js";

const ENTITIES = { "&lt;": "<", "&gt;": ">", "&amp;": "&" };
const decode = (s) => s.replace(/&(lt|gt|amp);/g, (m) => ENTITIES[m]);

// `names` answers user and channel ids: { user(id), channel(id) }, each a
// name or null.
export function toMarkdown(text, names = {}) {
  if (!text) return "";
  const kept = [];
  const keep = (s) => `\u0000${kept.push(s) - 1}\u0000`;
  const unlink = (s) => s.replace(/<((?:https?|mailto):[^|>]*)(?:\|([^>]*))?>/g, (_m, url, label) => label ?? url);

  let s = text
    // A code block may start and end mid-line in Slack; markdown needs fences on their own lines.
    .replace(/[ \t]*```([\s\S]*?)```[ \t]*/g, (_m, code) => `\n${keep(`\`\`\`\n${decode(unlink(code)).replace(/^\n+|\n+$/g, "")}\n\`\`\``)}\n`)
    .replace(/`([^`\n]+)`/g, (_m, code) => keep(`\`${decode(unlink(code))}\``))
    .replace(/<([^>\n]+)>/g, (_m, inner) => keep(token(inner, names)));

  s = s
    .replace(/(^|[\s(>])\*([^*\n]+?)\*(?=$|[\s).,!?:;'"])/gm, "$1**$2**")
    .replace(/(^|[\s(>])_([^_\n]+?)_(?=$|[\s).,!?:;'"])/gm, "$1*$2*")
    .replace(/(^|[\s(>])~([^~\n]+?)~(?=$|[\s).,!?:;'"])/gm, "$1~~$2~~")
    .replace(/:([a-z0-9_+'-]+(?:::skin-tone-\d)?):/g, (m, name) => (emoji(name) === `:${name}:` ? m : emoji(name)));
  s = decode(s)
    // A line starting with # would draw as a heading; Slack shows it as text.
    .replace(/^(\s*)#/gm, "$1\\#")
    .replace(/^(\s*)(\d+)\)/gm, "$1$2\\)")
    .split("\n").map((line) => line.trimEnd()).join("  \n")
    .replace(/(  \n){2,}/g, "\n\n");
  return s.replace(/\u0000(\d+)\u0000/g, (_m, i) => kept[Number(i)]).trim();
}

function token(inner, names) {
  const [target, label] = splitOnce(inner, "|");
  if (target.startsWith("@")) return `**@${names.user?.(target.slice(1)) ?? label ?? target.slice(1)}**`;
  if (target.startsWith("#")) return `**#${label || names.channel?.(target.slice(1)) || target.slice(1)}**`;
  if (target.startsWith("!subteam^")) return `**${label ?? "@group"}**`;
  if (target.startsWith("!date^")) return label ?? "";
  if (target.startsWith("!")) return `**@${target.slice(1).split("^")[0]}**`;
  if (/^(https?|mailto):/.test(target)) {
    const url = decode(target);
    const text = label ? decode(label) : url.replace(/^mailto:/, "");
    return `[${text.replace(/[[\]]/g, "\\$&")}](${url.replace(/[()\s]/g, encodeURIComponent)})`;
  }
  return decode(label ?? target);
}

function splitOnce(s, sep) {
  const i = s.indexOf(sep);
  return i < 0 ? [s, null] : [s.slice(0, i), s.slice(i + 1)];
}

// One line for a list row or a notification: no markup at all.
export function plain(text, names = {}) {
  return decode(String(text ?? "")
    .replace(/<([^>\n]+)>/g, (_m, inner) => token(inner, names).replace(/\*\*/g, "").replace(/^\[(.*)\]\(.*\)$/, "$1"))
    .replace(/:([a-z0-9_+'-]+):/g, (m, name) => (emoji(name) === `:${name}:` ? m : emoji(name))))
    .replace(/\s+/g, " ").trim();
}
