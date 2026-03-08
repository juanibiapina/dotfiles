# Impeccable Design Skills

Design skills and commands for AI-assisted frontend development, integrated from [Impeccable](https://github.com/pbakaus/impeccable) by Paul Bakaus.

## Origin

Impeccable is a collection of design-focused skills originally built for Claude Code. This integration adapts them into pi's native concepts: **prompt templates** for user-invokable commands and a **skill** for design reference material.

Source: `$WORKSPACE/pbakaus/impeccable/source/skills/`

## What's Included

### Prompt Templates (17 commands)

Available as `/impeccable:<name>` in pi. Located in `dotfiles/pi/.pi/agent/prompts/`.

| Command | Purpose |
|---------|---------|
| `/impeccable:adapt` | Adapt designs for different screen sizes, devices, or platforms |
| `/impeccable:animate` | Add purposeful animations and micro-interactions |
| `/impeccable:audit` | Comprehensive audit of accessibility, performance, and responsive design |
| `/impeccable:bolder` | Amplify safe or boring designs to increase visual impact |
| `/impeccable:clarify` | Improve unclear UX copy, error messages, and labels |
| `/impeccable:colorize` | Add strategic color to monochromatic interfaces |
| `/impeccable:critique` | Evaluate design effectiveness with actionable feedback |
| `/impeccable:delight` | Add moments of joy and personality to interfaces |
| `/impeccable:distill` | Strip designs to their essence, removing unnecessary complexity |
| `/impeccable:extract` | Extract reusable components and design tokens into a design system |
| `/impeccable:harden` | Improve resilience: error handling, i18n, text overflow, edge cases |
| `/impeccable:normalize` | Align a feature with an existing design system |
| `/impeccable:onboard` | Design onboarding flows, empty states, and first-time experiences |
| `/impeccable:optimize` | Improve loading speed, rendering, animations, and bundle size |
| `/impeccable:polish` | Final quality pass: alignment, spacing, consistency, and detail |
| `/impeccable:quieter` | Tone down overly bold or aggressive designs |
| `/impeccable:teach` | One-time setup to gather and persist design context for a project |

### Skill: `frontend-design`

A comprehensive design reference loaded on demand by the agent. Located in `dotfiles/agents/.agents/skills/frontend-design/`.

Contains `SKILL.md` plus 7 reference files covering typography, color and contrast, spatial design, motion design, interaction design, responsive design, and UX writing.

Referenced by the `/frontend` prompt template and by several impeccable commands (e.g. `/impeccable:polish`, `/impeccable:animate`).

## Updating

To update after upstream changes, re-clone or pull `pbakaus/impeccable` and regenerate the files. The original sync was done with a script that:

1. Extracted each `user-invokable: true` source skill → pi prompt template with `description` frontmatter and `$ARGUMENTS`
2. Copied `frontend-design/` → pi skill with `SKILL.md` + `reference/` directory
3. Resolved placeholders: `{{ask_instruction}}` → `ask the user to clarify`, `{{available_commands}}` → list of `/impeccable:*` commands, `{{config_file}}` → `AGENTS.md`, `{{model}}` → `the model`

## License

Impeccable is licensed under Apache 2.0. The `frontend-design` skill is based on Anthropic's frontend-design skill — see the license field in its `SKILL.md` frontmatter.
