---
name: notes
description: Manage personal notes in an Obsidian vault at $NOTES_VAULT. Use when the user mentions notes, vault, knowledge base, or asks to find/create/read/edit notes. Triggers on daily notes, project tasks, personal information lookup, or any note-related request.
---

# Notes Vault

Personal notes stored as markdown files in an Obsidian vault.

## Setup

The `$NOTES_VAULT` environment variable must be set to the vault path.

## First Interaction

Always read `$NOTES_VAULT/AGENTS.md` first. It contains:
- Personal information
- Vault structure and entry points
- Wikilink and tag conventions
- Daily note and project note formats

## File Conventions

The `.md` extension is optional in user requests - add it if missing.

## Common Operations

Search notes:
```bash
rg "pattern" "$NOTES_VAULT"
```

Find files by name:
```bash
find "$NOTES_VAULT" -name "*keyword*" -type f
```

Today's daily note:
```bash
$NOTES_VAULT/daily/$(date +%Y-%m-%d).md
```

List recent notes:
```bash
ls -lt "$NOTES_VAULT"/*.md | head -20
```
