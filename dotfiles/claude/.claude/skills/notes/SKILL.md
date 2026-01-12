---
name: notes
description: Read, write, and search markdown notes in a local vault. Use when the user mentions notes, vault, knowledge base, or asks to find/create/read notes.
metadata:
  author: juanibiapina
  version: "0.2"
---

# Notes Vault

A directory of `.md` files at `$NOTES_VAULT`. This environment variable must be set.

**First interaction**: Read `$NOTES_VAULT/AGENTS.md` for vault-specific instructions.

## Operations

- **Read/Write**: Standard file operations on `$NOTES_VAULT/*.md`
- **Search**: Use `rg` (not grep) for searching content
- **List**: Use `find` or `tree` for listing notes

## Notes

- Auto-create parent directories when writing to subdirectories
- The `.md` extension is optional in user requests (add it if missing)
