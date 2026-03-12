---
description: Cloudflare platform guidance — Workers, Pages, D1, KV, R2, Durable Objects, Agents SDK, Wrangler, and more
---

# Cloudflare

You are helping build on the Cloudflare Developer Platform. Your knowledge of Cloudflare APIs, types, and configuration may be outdated. **Prefer retrieval over pre-training** — fetch latest docs before writing or reviewing Cloudflare code.

$ARGUMENTS

## Retrieval Sources

Fetch the **latest** versions before writing Cloudflare code. Do not rely on baked-in knowledge for API signatures, config fields, or binding shapes.

| Source | URL | Use for |
|--------|-----|---------|
| Workers docs | `https://developers.cloudflare.com/workers/` | Runtime API, compatibility dates/flags |
| Workers best practices | `https://developers.cloudflare.com/workers/best-practices/workers-best-practices/` | Canonical patterns, anti-patterns |
| Pages docs | `https://developers.cloudflare.com/pages/` | Static sites, Functions, build config |
| D1 docs | `https://developers.cloudflare.com/d1/` | SQL database, bindings, migrations |
| KV docs | `https://developers.cloudflare.com/kv/` | Key-value storage |
| R2 docs | `https://developers.cloudflare.com/r2/` | Object storage, S3-compatible API |
| Durable Objects | `https://developers.cloudflare.com/durable-objects/` | Stateful coordination, WebSockets, SQLite |
| Agents SDK | `https://developers.cloudflare.com/agents/` | AI agents, state, scheduling, MCP servers |
| Wrangler docs | `https://developers.cloudflare.com/workers/wrangler/` | CLI reference, config fields |
| Workers types | Run `wrangler types` or check `node_modules/wrangler/config-schema.json` | Type definitions, binding shapes |

## Product Decision Tree

```
Need to run code at the edge?
├── Static site/SSR → Pages (+ Functions for server-side)
├── API/backend logic → Workers
├── Stateful coordination (chat, games, booking) → Durable Objects
│   └── Need persistent state? → Durable Objects with SQLite
├── AI agent with state/scheduling → Agents SDK (built on Durable Objects)
└── MCP server → Agents SDK with MCP support

Need storage?
├── Key-value (config, sessions, cache) → KV
├── Relational data → D1
├── Files/blobs → R2
├── Vector embeddings → Vectorize
└── Queues/async work → Queues

Need AI inference?
├── Run models → Workers AI
├── Embeddings + search → Vectorize
├── Gateway/routing → AI Gateway
└── Stateful agents → Agents SDK

Need IaC?
├── Terraform → cloudflare provider
└── Pulumi → @pulumi/cloudflare
```

## Wrangler Quick Reference

```bash
# Project setup
wrangler init                     # New project
wrangler types                    # Generate Env types from config — never hand-write binding interfaces

# Development
wrangler dev                      # Local dev server
wrangler dev --remote             # Dev against real bindings

# Deploy
wrangler deploy                   # Deploy to production
wrangler deploy --env staging     # Deploy to environment

# Storage
wrangler d1 create <name>         # Create D1 database
wrangler d1 migrations create <db> <name>  # Create migration
wrangler d1 migrations apply <db> # Apply migrations
wrangler d1 execute <db> --command "SELECT ..."  # Run SQL

wrangler kv namespace create <name>
wrangler kv key put --binding <name> "key" "value"

wrangler r2 bucket create <name>

# Secrets
wrangler secret put <name>        # Never hardcode secrets in config or source

# Tail/logs
wrangler tail                     # Live logs
```

## Configuration (wrangler.jsonc)

Use JSONC format — newer features are JSON-only. Always run `wrangler types` after changing config.

```jsonc
{
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-03-01",  // Set to today on new projects; update periodically
  "compatibility_flags": ["nodejs_compat"],  // Enable — many libraries need Node.js built-ins
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  },

  // Bindings
  "kv_namespaces": [{ "binding": "MY_KV", "id": "..." }],
  "d1_databases": [{ "binding": "MY_DB", "database_id": "...", "database_name": "..." }],
  "r2_buckets": [{ "binding": "MY_BUCKET", "bucket_name": "..." }],
  "durable_objects": { "bindings": [{ "name": "MY_DO", "class_name": "MyDO" }] },
  "queues": { "producers": [{ "binding": "MY_QUEUE", "queue": "..." }] },
  "ai": { "binding": "AI" },
  "vectorize": [{ "binding": "MY_INDEX", "index_name": "..." }],
  "services": [{ "binding": "OTHER_WORKER", "service": "..." }]
}
```

## Workers Best Practices

### Do

| Pattern | Why |
|---------|-----|
| Use bindings (KV, R2, D1, Queues) not REST API | In-process, faster, no auth overhead |
| Stream large/unknown payloads | Never `await response.text()` on unbounded data |
| `ctx.waitUntil()` for post-response work | Don't block the response; don't destructure `ctx` |
| Use service bindings for Worker-to-Worker | Not public HTTP |
| Use Hyperdrive for external Postgres/MySQL | Connection pooling at the edge |
| Use `crypto.randomUUID()` / `crypto.getRandomValues()` | Never `Math.random()` for security |
| Structured JSON logging with `observability` enabled | Use `head_sampling_rate` for sampling |
| Run `wrangler types` to generate `Env` | Never hand-write binding interfaces |

### Don't (Anti-Patterns)

| Anti-pattern | Fix |
|--------------|-----|
| `await response.text()` on unbounded data | Stream with `ReadableStream` |
| Store request-scoped data in module-level variables | Pass through handler params |
| Floating promises (not awaited, returned, or `waitUntil`'d) | `await`, `return`, `void`, or `ctx.waitUntil()` |
| Hardcoded secrets in source or config | `wrangler secret put` |
| `passThroughOnException()` | Explicit try/catch with structured error responses |
| Calling Cloudflare REST API from Workers | Use bindings |
| `Math.random()` for security-sensitive values | Use Web Crypto API |
| Hand-written `Env` interface | Run `wrangler types` |

## Worker Patterns

### Basic Worker

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    // Route handling
    return new Response("Hello");
  },
} satisfies ExportedHandler<Env>;
```

### Durable Object

```typescript
import { DurableObject } from "cloudflare:workers";

export class MyDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    // this.ctx.storage for state
    // this.ctx.storage.sql for SQLite
    return new Response("OK");
  }
}
```

### Agent (Agents SDK)

```typescript
import { Agent } from "agents-sdk";

export class MyAgent extends Agent<Env, State> {
  // State, scheduling, RPC, MCP server, email handling, streaming chat
}
```

**Note:** The Agents SDK API evolves frequently. Fetch the latest docs before writing agent code.

## Pages

```bash
wrangler pages project create <name>
wrangler pages deploy <directory>     # Deploy static assets
```

- Functions in `functions/` directory map to routes
- `_middleware.ts` for middleware
- Static assets served from build output
- Use `env.ASSETS.fetch()` for SPA fallback

## When Reviewing Cloudflare Code

1. **Fetch latest types** — run `wrangler types` or check published `@cloudflare/workers-types`
2. **Check compatibility date** — is it recent? Should it be updated?
3. **Check `nodejs_compat`** — is it enabled if Node.js APIs are used?
4. **Scan for anti-patterns** — see the table above
5. **Verify bindings match config** — does `Env` match `wrangler.jsonc`?
