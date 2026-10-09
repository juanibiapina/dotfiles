---
name: changelog
description: >
  Writes changelog entries for external users in Keep a Changelog format.
  Use when writing or updating a changelog. Always load this skill before editing
  the changelog file. Triggers on "update the changelog", "add a changelog entry",
  "changelog", or editing CHANGELOG.md.
---

# Changelog

A changelog is for an **external user** to glance over and understand what changed
**for them**, without reading the code or the commits.

It is not a record of internal work. Refactors, renamed modules, reworked
algorithms, and implementation details do not belong here unless the user can
observe the difference.

Write a short description of what was added, changed or removed, without details. Keep high level.

- Start with a verb (Add, Fix, Change, Remove, Deprecate)
- Be concise but descriptive
- Include issue/PR references when relevant
- Group related changes together if they're still unreleased
- Focus on user impact
- Do not merge or edit entries in already-released sections.
- Use "Keep a changelog" format: https://keepachangelog.com/en/1.1.0/
- Keep a blank line after section headers

Examples:
- Add support for attachments
- Improve TUI performance
- Remove the option to change your name

## Change Types (Sections)

- Unreleased - Accumulates changes before the next release

For released versions:

- Added - New features
- Changed - Changes in existing functionality
- Removed - Now removed features
- Fixed - Bug fixes
- Security - Vulnerability fixes

Only include sections that have entries. Empty sections should be omitted.
