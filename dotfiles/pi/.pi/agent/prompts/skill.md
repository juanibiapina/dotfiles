---
description: Research and compile a dynamic skill for a topic
---

# Skill

Research and compile a concise, actionable skill for: $ARGUMENTS

## Constraints

- Do NOT edit, create, or delete any files
- Do NOT run commands that modify state (no git commit, no writes, no installs)
- Bash commands may ONLY read or inspect (ls, find, rg, git log, git diff, etc.)
- Present the compiled skill directly in the conversation

## Workflow

### 1. Search

Run `npx skills find "<query>"` to discover relevant skills on skills.sh. Use multiple queries with different keywords to cover the topic broadly.

### 2. Read & Summarize

For each discovered skill, read its content with `websearch extract` on the skills.sh URL. After reading each skill, summarize it: what it covers, key concepts, workflows, and unique techniques.

### 3. Analyze

Build a comparison table of all skills read — what each covers, where they overlap, what's unique to each, and what gaps remain. This table is the reference point for deciding what makes it into the final skill.

### 4. Research

Use `websearch search` for best practices, patterns, and strategies not covered by existing skills. Focus on actionable, non-obvious knowledge.

### 5. Compile

Synthesize everything into a single concise skill:

- Frontmatter with name and description
- Imperative form, concise — only include what an agent wouldn't already know
- Organized by workflow steps or domain areas
- Cite which source skills and research informed each section
