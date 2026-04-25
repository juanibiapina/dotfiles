---
name: find-skills
description: >
  Discover and load agent skills from the SkillsMP marketplace. Use when the user asks
  "how do I do X", "find a skill for X", "is there a skill for X", "can you do X" where X
  is a specialized capability, or expresses interest in extending agent capabilities.
---

# Find Skills

Search the [SkillsMP](https://skillsmp.com) marketplace (~900K skills indexed from GitHub) and load any candidate into the current session via the `load_skill_from_url` tool.

## Workflow

### 1. Search

Hit the public REST API. Anonymous works (50 req/day, 10 req/min, keyword search).

```bash
curl -fsSL "https://skillsmp.com/api/v1/skills/search?q=<query>&sortBy=stars&limit=10" | jq
```

Useful parameters:
- `q` (required) — keywords, max 200 chars
- `sortBy` — `stars` or `recent` (default: `recent`)
- `limit` — up to 50
- `category` — slug from <https://skillsmp.com/categories>
- `occupation` — SOC slug from <https://skillsmp.com/occupations>

Each result has: `id`, `name`, `author`, `description`, `githubUrl`, `skillUrl`, `stars`, `updatedAt`.

On HTTP 429, back off and tell the user (rate limit hit).

### 2. Filter

SkillsMP indexes the GitHub long tail; many useful skills sit at 0 stars. Don't hard-floor by stars.

In order of weight:
- `description` matches the user's intent
- Author/repo reputation — known-good: `anthropics`, `vercel-labs`, `microsoft`, `obra`, `ComposioHQ`
- Stars ≥10 is a soft positive signal; treat low stars as neutral, not disqualifying

### 3. Preview the skill text

Before recommending, read the actual `SKILL.md`. Convert the API's `githubUrl` to raw:

- `githubUrl`: `https://github.com/<owner>/<repo>/tree/<ref>/<subpath>`
- raw URL: `https://raw.githubusercontent.com/<owner>/<repo>/<ref>/<subpath>/SKILL.md`

One-liner (replaces `/tree/` with `/` so neighbouring slashes survive):

```bash
RAW=$(echo "$githubUrl" | sed 's|github.com|raw.githubusercontent.com|; s|/tree/|/|')/SKILL.md
curl -fsSL "$RAW"
```

Skim the frontmatter and body to confirm fit and surface anything important (required tools, env vars, caveats).

### 4. Recommend

Show the user 1–3 options. For each:

- name (and author)
- one-line summary drawn from frontmatter `description`
- stars
- `skillUrl` for the marketplace page
- `githubUrl` for the source

Example:

```
Found a couple of options:

1. playwright by A-Kuo (0 stars)
   Browser automation from the terminal via playwright-cli.
   https://skillsmp.com/skills/a-kuo-cipher-cursor-skills-playwright-skill-md
   Source: https://github.com/A-Kuo/CIPHER/tree/main/.cursor/skills/playwright

2. ...

Want me to load one?
```

### 5. Load on confirm

Pass the API's `githubUrl` straight to the tool — it already has the right shape:

```
load_skill_from_url(url="<githubUrl>")
```

Then `Read SKILL.md` from the returned dir and follow it for the rest of the task.

### 6. No matches

Say so, offer to do the task with general capabilities. Optionally suggest the user create their own skill (see the `managing-skills` skill).
