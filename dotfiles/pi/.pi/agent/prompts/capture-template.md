---
description: Extract a workflow from this conversation and write it as a reusable prompt template
---

# Capture Template

Distill a repeatable workflow from this conversation into a prompt template. If guidance is given below, use it to decide what to capture, what to name it, or where to place it. Otherwise, figure it out from the conversation.

## Focus

$ARGUMENTS

## Workflow

### 1. Extract

Review the conversation and identify the repeatable workflow:

- What triggers it? What situation or request starts this workflow?
- What steps are involved? What does the agent do, in what order?
- What constraints matter? What must be avoided, what quality bar applies?
- What decisions need to be made? What varies between uses?
- Strip away conversation-specific details. Keep the generalizable pattern.

### 2. Shape

Design the template:

- **Name**: derive a short, descriptive filename (this becomes the `/name` command)
- **Description**: write a one-line description for autocomplete (frontmatter `description` field)
- **Arguments**: decide whether the template needs `$ARGUMENTS` (user-provided input) or works purely from conversation context. Use `$ARGUMENTS` when the template needs a topic, target, or specific focus each time. Omit it when the template should derive everything from conversation history and repo state.
- **Body**: distill into concise, imperative instructions. Match the style of existing templates: numbered workflow steps, short paragraphs, bullet lists. Only include what an agent wouldn't already know.
- **Read-only or not**: if the template only inspects and reports, add the read-only constraints block. If it creates or modifies files, omit it.

### 3. Place

Decide where the template goes:

- **Project-local** (`.agents/prompts/<name>.md`): default choice. Use for workflows specific to a project or repo.
- **Global** (`dotfiles/agents/.agents/prompts/<name>.md` in the dotfiles repo, then `make` to stow-link): use for workflows that are useful across all projects.

Default to project-local unless the workflow is clearly general-purpose. If unclear, ask.

### 4. Write

Create the template file:

- Use the standard frontmatter format (`description` field)
- Follow the structure: heading, intro paragraph, optional `$ARGUMENTS` section, numbered workflow steps
- Be concise. Templates are instructions, not documentation.
- The template must stand alone. A user invoking `/name` shouldn't need the original conversation.

### 5. Verify

Check the result:

- Read the file back. Does it make sense as a standalone command?
- Does it follow the conventions of existing templates in the same directory?
- Is the description useful for autocomplete? Would a user recognize what it does?
- Would this template produce good results if invoked in a fresh conversation?
