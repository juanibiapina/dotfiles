---
name: documentation
description: "Rules for documentation, including one source of truth per fact, what belongs in README.md and AGENTS.md, and where plans go. Use when writing plans, documentation, code comments, commit messages, or PR descriptions."
---

# Documentation

- Give each fact one source of truth. Do not duplicate information in text.
- Do not use code comments.
- Match a document's length to what its purpose needs: cover the substance, without filler sections, repeated summaries, or boilerplate.

## Documents

Every file has a purpose. Include only content that serves that purpose.

- `README.md`: The front page of the repository or project. List major features at a high level. Get users installed and configured fast.
- `AGENTS.md`: Information for agents on how to work in the local directory. Loaded in the beginning of every agent session. Does not need to be referenced from other documents.
- Plans: Save with `save_plan`.
