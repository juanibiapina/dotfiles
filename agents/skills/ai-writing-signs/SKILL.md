---
name: ai-writing-signs
description: >
  Patterns in vocabulary, structure, formatting, tone, and citations that are
  characteristic of LLM-generated text. Avoid these when writing any text.
---

# Signs of AI writing

AI writing is detectable because LLMs regress to statistical means, replacing specific facts with generic, inflated language. The subject becomes simultaneously less specific and more exaggerated.

These are observations, not rules. Any individual sign can appear in human writing. Clusters of multiple signs are what indicate AI origin.

## Vocabulary

Certain words are statistically overrepresented in LLM output. They often co-occur: where there is one, there are likely others.

Words that appear far more frequently in post-2022 text: delve, crucial, pivotal, intricate/intricacies, tapestry (figurative), vibrant, underscore (as verb), garner, bolstered, fostering, enhance, showcase, landscape (figurative), testament, meticulous/meticulously, interplay, enduring, align with, emphasizing, highlighting, key (as adjective), valuable, exemplifies, encompasses, nestled

The distribution shifts over time. "Delve" was overused by ChatGPT in 2023-2024 but dropped off in 2025. Newer models overuse "emphasizing", "enhance", "highlighting", "showcasing."

## Copula avoidance

LLMs substitute "is", "are", and "has" with fancier constructions: "serves as", "stands as", "boasts", "features", "maintains", "represents", "holds the distinction of being." Studies have documented over a 10% decrease in the usage of "is" and "are" in academic writing after 2023.

## Lexical diversity

LLMs have a repetition-penalty that discourages reusing words. They cycle through synonyms for the same concept unnaturally, producing elegant variation that reads as mechanical rather than natural.

## Inflated significance and legacy

LLM writing inflates the importance of subjects by connecting them to broader themes. There is a distinct repertoire of phrases: "marks a pivotal moment", "represents a significant shift", "part of a broader movement", "setting the stage for", "shaping the future of", "stands as a testament", "leaves a lasting impact", "indelible mark", "deeply rooted", "enduring legacy", "focal point."

For biology topics, LLMs over-emphasize connections to the broader ecosystem and belabor conservation status, even when the status is unknown and no serious efforts exist.

## Superficial analysis

LLMs insert shallow analysis by attaching present participle ("-ing") phrases at the end of sentences: "emphasizing the importance of solidarity", "contributing to the socio-economic development", "reflecting the rich culture", "fostering a sense of connection." These are often synthesis or unattributed opinions.

Newer chatbots with web search may attach these statements to named sources regardless of whether those sources say anything close.

## Vague attributions

LLMs attribute opinions to vague authorities: "experts argue", "observers have cited", "industry reports suggest", "researchers and conservationists." They also exaggerate the quantity of sources, presenting views from one or two sources as widely held.

## Promotional tone

LLM output tends toward advertisement-like writing or travel-guide prose, even when prompted for encyclopedic style. This happens both when generating new text and when rewriting existing text.

Tourism register: "breathtaking", "stunning natural beauty", "must-visit", "in the heart of", "offers visitors a fascinating glimpse", "rich cultural heritage/tapestry", "nestled", "vibrant"

Press-release register: "commitment to excellence", "demonstrating leadership", "reinforcing its position as", "a diverse array of"

LLMs also note that subjects "maintain an active social media presence" in a way that is idiosyncratic to AI text.

## Challenges-then-hope formula

Many LLM-generated articles include a "Challenges" section beginning with "Despite its [positive words], X faces challenges..." and ending with a vaguely positive assessment or speculation about how initiatives could benefit the subject. A separate "Future Prospects" section often follows. The rigid formula is the tell, not the mention of challenges.

## Negative parallelisms

LLMs overuse parallel constructions involving "not" and "but": "not only ... but ...", "it is not just ..., it's ...", "not X, but Y." They also use the form "no ..., no ..., just ..."

## Rule of three

LLMs overuse the rule of three, defaulting to three-item groupings: "adjective, adjective, adjective" or "short phrase, short phrase, and short phrase." They often use this structure to make superficial analyses appear comprehensive.

## Canned notability emphasis

LLMs act as if the best way to prove a subject is notable is to list sources it has been covered in, specifying what kind of sources they are ("trade publications", "regional media"). They often echo the exact wording of Wikipedia's guidelines, such as "independent coverage." They painstakingly attribute even trivial coverage to named outlets in body text.

## Inline-header vertical lists

AI output includes vertical lists formatted with a list marker followed by a boldfaced inline header, separated with a colon from descriptive text. When copied as plain text, formatting and line breaks may be lost, creating run-on paragraphs with bold fragments.

## Formatting signs

Em dashes: LLM output uses em dashes more often than human-written text of the same genre, and in places where commas, parentheses, or colons would be more typical. This is most common on discussion pages.

Boldface: AI chatbots bold phrases for emphasis in an excessive, mechanical manner, often emphasizing every instance of a chosen word or phrase in a "key takeaways" fashion.

Title case: In section headings, AI chatbots capitalize all main words.

Curly quotes: ChatGPT and DeepSeek use curly quotation marks and apostrophes instead of straight ones. They may also mix curly and straight inconsistently. Gemini and Claude typically do not.

Heading levels: AI chatbots tend to skip level 2 headings and start from level 3.

Thematic breaks: AI chatbots sometimes include a thematic break (horizontal rule) before each heading.

Emoji: AI chatbots have decorated section headings or bullet points with emoji.

## Tone artifacts

Collaborative communication leaks into output: "I hope this helps", "Would you like me to", "Here is a summary of", "Certainly!", "Of course!", "Let me know if." These appear when users paste chatbot responses without editing.

Didactic disclaimers (common in older models): "it's important to note", "worth noting", "may vary", "it is crucial to consider."

Section summaries: older LLMs added sections titled "Conclusion" and ended paragraphs with "In summary" or "Overall" restating the core idea.

Knowledge-cutoff disclaimers: "as of my last knowledge update", "not widely documented", "while specific details are limited", "based on available information." Newer chatbots with web search claim information is "not publicly available" and then speculate about what it "likely" is.

Editorializing: "no discussion would be complete without", "in this article, we will explore."

## Citation artifacts

Hallucinated references: non-existent URLs, invalid DOIs and ISBNs, DOIs that resolve to unrelated articles, book citations without page numbers.

Placeholder text: `[INSERT_URL_HERE]`, `2025-XX-XX`, `[Your Name]`, `[Describe the specific section]`.

UTM parameters revealing origin: `utm_source=chatgpt.com`, `utm_source=openai`, `utm_source=copilot.com`, `referrer=grok.com`.

Markup artifacts from specific platforms: `turn0search0`, `oaicite`, `contentReference`, `grok_card`, `attached_file`, lenticular bracket notation like `【85†L261-269】`.

Named references declared in a references section but never used inline in the article body.

## Differences between LLMs

Each model has a distinctive writing style. Focusing on broader context is more characteristic of ChatGPT and Grok than Gemini and Claude. Gemini and Claude responses tend to be more concise. ChatGPT is likely the most prevalent chatbot used for generated text.

ChatGPT and DeepSeek use curly quotes; Gemini and Claude typically do not. ChatGPT adds UTM parameters to URLs more often than other models.
