---
name: documentation
description: "Use when writing plans, documentation, code comments, commit messages, PR descriptions."
---

# Documentation

- Give each fact one source of truth. Do not duplicate information in text.
- Do not use code comments.

## Documents

Every file has a purpose. Include only content that serves that purpose.

- `README.md`: The front page of the repository or project. List major features at a high level. Get users installed and configured fast.
- `AGENTS.md`: Information for agents on how to work in the local directory. Loaded in the beginning of every agent session. Does not need to be referenced from other documents.
- Plans: Save with `save_plan`.
