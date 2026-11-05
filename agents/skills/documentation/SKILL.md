---
name: documentation
description: "Rules for documentation, including one source of truth per fact, what belongs in README.md and AGENTS.md, where plans go, and how to write commit messages and pull request descriptions. Use when writing plans, documentation, code comments, commit messages, or PR titles and descriptions."
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

## Commits and pull requests

A commit message or PR description tells a reviewer what the change does and why, in a few plain sentences. The diff and the linked issue carry the details.

Say three things, each in one sentence:

1. **The change**, in the imperative: "Add a setting to turn off toasts."
2. **The problem**: what the person can't do today.
3. **The alternative and why it falls short**, when there is one.

Then stop. Link the issue on its own line (`Closes #74.`) when there is one.

For a commit, the subject line is the change. Add the problem and the alternative in the body only when the subject doesn't make them clear. Follow the repository's own rules for commits and PRs (format, length, required sections) when it has them.

Leave out:

- **The diff restated**: setting names, values, paths, defaults. The reader opens the diff for those.
- **Reassurance**: what isn't affected, "nothing changes unless you set it".
- **Mechanisms**: internal details of how it works. Name the problem a reviewer cares about instead.
- **Long sentences** that chain details after a colon. Write one short sentence per point.

<example>
Closes #74.

Add a setting to turn off toasts. There is no way to stop these toasts today. You can try to hide them with a mod as they appear, but it isn't clean.
</example>
