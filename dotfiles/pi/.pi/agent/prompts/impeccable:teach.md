---
description: One-time setup that gathers design context for your project and saves it to your AI config file. Run once to establish persistent design guidelines.
---

Gather design context for this project, then persist it for all future sessions.

$ARGUMENTS

## Explore the Codebase

Scan the project to discover what you can before asking questions: README and docs (purpose, audience, goals), package config (tech stack, design libraries), existing components and patterns, brand assets (logos, favicons, defined colors), design tokens and CSS variables, style guides or brand documentation.

## Ask About What's Missing

Focus only on what you couldn't infer from the codebase:

- **Users & Purpose**: Who uses this? What's their context? What job are they doing? What emotions should the interface evoke?
- **Brand & Personality**: 3-word brand personality? Reference sites that capture the right feel? Anti-references?
- **Aesthetic Preferences**: Visual direction (minimal, bold, elegant, playful, technical)? Light/dark/both? Colors to use or avoid?
- **Accessibility**: Specific WCAG level? Known user needs?

Skip questions where the answer is already clear from the codebase.

## Write Design Context

Synthesize findings into a `## Design Context` section with subsections for Users, Brand Personality, Aesthetic Direction, and Design Principles (3-5 derived from the conversation).

Write this section to AGENTS.md in the project root. If the file exists, append or update the Design Context section.
