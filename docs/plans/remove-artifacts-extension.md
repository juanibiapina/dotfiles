# Remove the artifacts extension, adopt an in-repo `docs/plans/` strategy

## Recommendation

Delete the artifacts extension and its whole `dev artifacts` CLI, and replace it
with one rule in the `documentation` skill: plans go in `docs/plans/<name>.md`
inside the target repo; research/notes go in `docs/investigations/<name>.md`.
Persistence across sessions comes from the file sitting on disk, so no custom
tooling is needed. The commit question is settled per-repo as a plain git
concern:

- Personal repos: commit `docs/plans/` (tracked by default, nothing to do).
- Work repos where plans must not be committed: add `docs/plans/` to that repo's
  `.git/info/exclude`. The file still lives on disk (cross-session work is
  unaffected), git never sees it, and no artifact machinery is involved.

## Why this over the alternatives

- Keep artifacts for work repos — rejected. `.git/info/exclude` reproduces the
  exact "on disk, invisible to git" behavior with zero custom code, and keeps a
  single path/workflow across all repos.
- Global `~/.gitignore` entry for `docs/plans/` — rejected. It would also hide
  plans in personal repos, where they should be committed. The ignore decision
  must be per-repo.

## What to change

Remove artifacts tooling:
1. Delete `dotfiles/pi/.pi/agent/extensions/artifacts.ts` (auto-loaded from the
   `extensions/` directory; no manifest entry to clean up).
2. Delete `cli/libexec/artifacts/` entirely. `sub` discovers commands from
   libexec, so removing the dir removes `dev artifacts` and its completions.
3. Delete `cli/test/artifacts`.
4. `flake.nix` — remove the `artifacts` check derivation. It is the only entry
   under `checks`, so remove the whole `checks = ...;` block.
5. `dotfiles/tmux/.tmux.conf` — remove the `bind-key e` mapping (and comment)
   that runs `dev artifacts browse`.
6. `docs/agent-configuration.md` — delete the "Artifacts extension" section,
   including the `prefix e` / `cli/libexec/artifacts/` reference.

Add the documentation strategy:
7. `agents/skills/documentation/SKILL.md` — add a "Where documents live" section.
8. `agents/skills/verify-plan/SKILL.md` — replace "or an artifact" wording with a
   reference to a `docs/plans/` file.

Migrate the one existing artifact:
9. `zsh-startup-profile-findings.md` lives in the pi-artifacts state dir. Move to
   `docs/investigations/` if still wanted, else leave it (harmless orphan).

## Acceptance criteria

- No `artifacts.ts` extension, no `dev artifacts` CLI, no `cli/test/artifacts`,
  no `checks.artifacts`, no tmux `prefix e` artifact binding.
- `docs/agent-configuration.md` no longer documents artifacts.
- `documentation` skill instructs where plans and research live and how the
  per-repo commit/ignore decision is made.
- The flake evaluates and the system builds.
