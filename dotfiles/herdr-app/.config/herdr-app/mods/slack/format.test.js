import { test } from "node:test";
import assert from "node:assert/strict";
import { toMarkdown, plain } from "./format.js";

const names = { user: (id) => ({ U1: "Ana" })[id] ?? null, channel: (id) => ({ C1: "general" })[id] ?? null };

test("mentions, channels and links get names and labels", () => {
  assert.equal(toMarkdown("hi <@U1>, see <#C1> and <https://x.dev/a_b_c|the_doc>", names),
    "hi **@Ana**, see **#general** and [the_doc](https://x.dev/a_b_c)");
  assert.equal(toMarkdown("<!here> ping <!subteam^S1|@eng>", names), "**@here** ping **@eng**");
});

test("emphasis changes syntax, snake_case and code stay", () => {
  assert.equal(toMarkdown("*bold* _it_ ~gone~ snake_case_name `a_b *c*`"), "**bold** *it* ~~gone~~ snake_case_name `a_b *c*`");
});

test("code blocks get fences on their own lines, with entities decoded", () => {
  assert.equal(toMarkdown("run ```if a &lt; b &amp;&amp; c\n  go()``` now"), "run  \n```\nif a < b && c\n  go()\n```  \nnow");
});

test("newlines stay line breaks, and a leading # stays text", () => {
  assert.equal(toMarkdown("one\ntwo\n\n#three :tada:"), "one  \ntwo\n\n\\#three 🎉");
});

test("plain flattens a message to one line", () => {
  assert.equal(plain("hey <@U1>\nlook <https://a.b|here> :+1:", names), "hey @Ana look here 👍");
});
