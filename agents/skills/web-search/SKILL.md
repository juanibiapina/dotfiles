---
name: web-search
description: Web search, content extraction, and research via multiple providers (Tavily, Exa, Brave, etc.). Use when searching for documentation, facts, current information, extracting content from URLs, fetching pages, finding similar pages, getting direct answers to questions, or finding code examples. Triggers on "search for", "look up", "find information", "extract content", "fetch page", "search the web", "research", or any web lookup task.
---

# Web Search

Use the `websearch` CLI for search, extraction, direct answers, similar pages, and code examples.

## Commands

```bash
websearch search "query"
websearch search "query" -p brave -n 10 --content
websearch extract "https://example.com/article"
websearch answer "latest React version"
websearch similar "https://example.com/article"
websearch code "Express middleware authentication"
```

All commands support `--json`.

## Provider guide

- `tavily`: best default for general search and answers
- `exa`: good for semantic search, fresh results, `similar`, and `code`
- `websearchapi`: Google-backed fallback with generous quota
- `brave`: useful alternative index
- `serpapi`: use for special engines like YouTube or Scholar

## Tips

- Use `--content` to avoid a separate extract call.
- Use `extract` for long docs pages.
- Switch providers when a quota is low.

## Environment

```text
TAVILY_API_KEY
EXA_API_KEY
WEBSEARCHAPI_KEY
BRAVE_API_KEY
SERPAPI_KEY
```
