# Web Search APIs for Coding Agents

**Date:** 2026-03-04
**Goal:** Identify web search tools with usable free tiers that can be adopted as Pi coding agent skills alongside or instead of the existing Brave Search skill.

## Current Setup

The Brave Search skill (`~/.agents/skills/brave-search/`) provides:
- `search.js` — CLI search via Brave Search API, returns titles/links/snippets
- `content.js` — URL-to-markdown extraction via Readability + Turndown
- `search.js --content` — combines both: search + fetch page content

Brave recently removed its free API tier (Feb 2026). Existing subscribers are grandfathered; new signups get $5/month credit (~1,000 queries) requiring credit card + public attribution.

## Selection Criteria

- Must have a **renewable free tier** (monthly reset, not one-time credits that run out)
- Credit card requirement is acceptable as long as free usage doesn't trigger charges
- Must be usable as a simple CLI skill (REST API returning JSON)

---

## Recommended Tools

### Category 1: AI-Native Search APIs

These return LLM-optimized content (summaries, citations, extracted text) — not just links.

#### 1. Tavily

- **Free tier:** 1,000 credits/month, renewable, no credit card required
- **API:** `POST https://api.tavily.com/search` with `TAVILY_API_KEY`
- **What it returns:** Structured JSON with summaries, citations, and content snippets trimmed for LLM context windows
- **Credit cost:** 1 credit per basic search, 2 per advanced search
- **Standout features:** Native LangChain/LlamaIndex integration. `/research` endpoint for multi-step autonomous research. Fast/ultra-fast modes for low-latency use.
- **Why adopt:** Community standard for AI agents. Closest replacement for Brave skill with better result quality for technical queries.
- **Website:** https://tavily.com

#### 2. Exa

- **Free tier:** 1,000 searches/month, renewable, no credit card required
- **API:** `POST https://api.exa.ai/search` with `EXA_API_KEY`
- **What it returns:** Semantically relevant results with content snippets, structured for machine consumption
- **Standout features:** Neural/semantic search using embeddings — understands meaning, not just keywords. "Find similar" takes a URL and returns related pages. 94.9% accuracy on SimpleQA benchmarks.
- **Why adopt:** Finds things keyword search cannot. Useful for exploratory queries like "examples of X pattern" or "articles explaining Y concept." The "find similar" feature is unique.
- **Website:** https://exa.ai

#### 3. WebSearchAPI.ai

- **Free tier:** 2,000 credits/month, renewable, no credit card required
- **API:** `POST https://api.websearchapi.ai/ai-search` with Bearer token
- **What it returns:** Google-powered search results with extracted page content and AI-generated answer summaries
- **Standout features:** Built on Google Search (91%+ market share engine). `includeContent` parameter returns pre-extracted page text. `includeAnswer` returns an AI summary. Country/language localization.
- **Why adopt:** Most generous free tier of the group. Google-quality results with content extraction built in — no separate scraping step needed.
- **Website:** https://websearchapi.ai

### Category 2: Traditional SERP APIs

These return structured search engine results (titles, URLs, snippets) without AI processing.

#### 4. Brave Search (existing)

- **Free tier:** Grandfathered existing plan; new signups get ~1,000 queries/month ($5 credit, requires credit card + attribution)
- **Already integrated** as `~/.agents/skills/brave-search/`
- **Note:** Independent index (not Google/Bing). Privacy-focused. New LLM Context API extracts relevant content chunks from pages.

#### 5. SerpAPI

- **Free tier:** 100 searches/month, renewable, no credit card required
- **API:** `GET https://serpapi.com/search` with `SERPAPI_KEY`
- **What it returns:** Structured JSON from 40+ search engines (Google, Bing, YouTube, Google Scholar, Amazon, StackOverflow, Yelp, DuckDuckGo, Baidu, Yandex, etc.)
- **Standout features:** The only API that searches YouTube, Scholar, Amazon, etc. through one integration. Interactive Playground for testing. CAPTCHA solving and proxy rotation handled automatically.
- **Why adopt:** Breadth is unmatched. 100/month is tight but valuable for targeted searches on specific engines (YouTube tutorials, Scholar papers, Amazon packages).
- **Website:** https://serpapi.com

### Honorable Mention

#### 6. Jina Reader

- **Free tier:** 10 million tokens one-time (not renewable, but massive — months/years of normal use)
- **API:** `GET https://s.jina.ai/?q={query}` (search + extract) or `GET https://r.jina.ai/{url}` (URL to markdown)
- **What it returns:** Search results with full extracted page content as markdown, in a single call
- **Standout features:** Zero-setup for basic use — no API key needed at low rate. Uses ReaderLM-v2 (1.5B model) for smart extraction. The `s.jina.ai` combo endpoint is essentially a better `search.js --content`.
- **Why it's here:** Despite being one-time credits, 10M tokens is so large it's effectively free for skill usage. Dead simple integration (could be a 30-line script).
- **Website:** https://jina.ai

---

## What Got Cut

| Tool | Free Tier | Why Excluded |
|---|---|---|
| Serper | 2,500 queries one-time | Does not renew |
| Firecrawl | 500 credits one-time | Does not renew |
| Perplexity Sonar API | None (pay-per-use only) | No free tier |
| Linkup | €5 one-time credits | Does not renew |
| ScrapingDog | 1,000 credits one-time | Does not renew |

## Summary

| Tool | Type | Free/Month | Key Strength |
|---|---|---|---|
| Tavily | AI-native | 1,000 | Best all-around for AI agents |
| Exa | AI-native | 1,000 | Semantic search, find-similar |
| WebSearchAPI.ai | AI-native | 2,000 | Google results + content extraction |
| Brave | Traditional | ~1,000 | Already integrated, independent index |
| SerpAPI | Traditional | 100 | 40+ engines (YouTube, Scholar, etc.) |
| Jina Reader | Extraction | 10M tokens (once) | Search + extract in one call, no key |
