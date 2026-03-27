---
description: Extract a capability from this conversation and write it as a reusable skill
---

# Capture Skill

Distill a repeatable capability from this conversation into a skill. If guidance is given below, use it to decide what to capture, what to name it, or where to place it. Otherwise, figure it out from the conversation.

## Focus

$ARGUMENTS

## Workflow

### 1. Extract

Review the conversation and identify the repeatable capability:

- What triggers it? What situation, request, or keywords should activate this skill?
- What steps are involved? What does the agent do, in what order?
- What tools or commands does it use? CLIs, APIs, file patterns?
- What constraints matter? What must be avoided, what quality bar applies?
- Strip away conversation-specific details. Keep the generalizable capability.

### 2. Shape

Design the skill:

- **Name**: lowercase, a-z, 0-9, and hyphens only (1-64 chars). This becomes the directory name and the `name` frontmatter field. They must match.
- **Description**: write a trigger-oriented description for the frontmatter. Include keywords and phrases that help the agent recognize when to load this skill (e.g., "Use when asked to...", "Triggers on..."). This is how the agent discovers the skill, so make it count.
- **Body**: distill into concise, imperative instructions. Numbered workflow steps, short paragraphs, bullet lists. Only include what an agent wouldn't already know.
- **Extra files**: decide whether the skill needs helper scripts (`scripts/`), reference material (`references/`), or other assets (`assets/`) alongside `SKILL.md`. Most skills are a single file. Only add extras when the skill genuinely needs them.

### 3. Place

Decide where the skill goes:

- **Project-local** (`.agents/skills/<name>/SKILL.md`): default choice. Use for capabilities specific to a project or repo.
- **Global** (`dotfiles/agents/.agents/skills/<name>/SKILL.md` in the dotfiles repo): use for capabilities useful across all projects. No `make` needed because the agents directory is symlinked by Nix.

Default to project-local unless the capability is clearly general-purpose. If unclear, ask.

### 4. Write

Create the skill:

- Create the directory `<name>/` and write `SKILL.md` inside it
- Frontmatter must include both `name` and `description` fields
- Follow the structure: heading, intro paragraph, numbered workflow steps
- Be concise. Skills are instructions, not documentation.
- The skill must stand alone. An agent loading it shouldn't need the original conversation.
- If extra files are needed, create them in subdirectories (`scripts/`, `references/`, `assets/`)

### 5. Verify

Check the result:

- Read `SKILL.md` back. Does it make sense as a standalone capability?
- Validate the name: lowercase a-z, 0-9, hyphens only, 1-64 chars, matches directory name and frontmatter `name`
- Is the description trigger-rich? Would an agent recognize when to load this skill?
- Does it follow the conventions of existing skills in the same directory?
- Would this skill produce good results if loaded in a fresh conversation?
