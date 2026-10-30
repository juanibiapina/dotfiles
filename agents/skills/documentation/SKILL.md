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
- `AGENTS.md`: See the section below.
- Plans: Save with `save_plan`.

## AGENTS.md

AGENTS.md holds the minimum an agent needs to start work in the directory. It loads into every agent session, so every line costs tokens on every task, and a long file buries the rules that matter.

- Include a one-line description of the project, how to build, test, and apply changes, and the conventions or traps that would make an agent fail and that the code does not show.
- Test each line: would an agent make a mistake without it? If the code, `--help`, a README, or a quick search reveals the fact, leave it out.
- Put a runbook for one topic or host in `docs/<topic>.md`, a procedure in a skill, and a command's behaviour in the command's own help header. Link them from AGENTS.md only when an agent would not find them otherwise.
- When you add a feature, document it in one of those places. Edit AGENTS.md only for a new rule that applies to most sessions in the directory.
