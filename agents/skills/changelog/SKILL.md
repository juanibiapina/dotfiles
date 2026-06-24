---
name: changelog
description: >
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

## Writing an Entry

Write from the user's perspective: what they will now see or get. Not from the
developer's perspective: what we did to the code.

- One bullet per change. Terse, present tense, a finished thought.
- Plain language. No module names, function names, or "reorganized the X".
- Describe the observable change or the benefit, not the mechanics.
- If a change is purely internal with no user-visible effect, it likely does not
  need an entry at all.

## Good vs Bad

A Rust diff tool reworked the algorithm that aligns lines. The user-visible result
is cleaner diffs with fewer spurious changes.

**Bad** (describes internal work):
> Changed: reworked the line-alignment algorithm to use a Myers-based LCS pass
> before the token diff, replacing the old greedy matcher.

**Good** (describes what the user sees):
> diff: align changed lines more accurately, reducing noisy diffs on edits.

## Merging Unreleased Entries

Within the `[Unreleased]` section, related entries can be merged to simplify the
changelog. When several unreleased bullets describe the same user-facing
improvement, collapse them into a single bullet framed from the user's
perspective. This applies even when the bullets span different groups
(`Added` / `Changed` / `Fixed`). It keeps the unreleased section concise before a
release is cut.

This only applies to unreleased entries. Do not merge or edit entries in
already-released sections.

## Format (Keep a Changelog)

Entries go under an `[Unreleased]` section, grouped by `Added` / `Changed` / `Fixed`.

Optionally prefix a bullet with the surface area, matching the repo's existing
style (e.g. `diff:`, `traces TUI:`).

```markdown
## [Unreleased]

### Added
- traces TUI: filter spans by service name.

### Changed
- diff: align changed lines more accurately, reducing noisy diffs on edits.

### Fixed
- crash when opening an empty file.
```
