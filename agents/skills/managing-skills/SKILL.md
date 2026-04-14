---
name: managing-skills
description: >
  Use when adding, installing, removing, or managing agent skills in this dotfiles repo.
  Triggers on "add skill", "install skill", "remove skill", "delete skill", "new skill",
  "manage skills", or any skill management task.
---

# Managing Skills

Skills are either local and editable, or external and wired through Nix.

## Files

- `agents/skills/` - local skills
- `flake.nix` - external sources
- `nix/modules/homemanager/agents.nix` - skill wiring

All installed skills end up at `~/.agents/skills/<name>/`.

## Local skills

Create `agents/skills/<name>/SKILL.md`.

## External skills

Add a flake input in `flake.nix`, then wire it in `agents.nix`.

Patterns:
- repo with many skills: use `subdir`
- nested repo: use `subdir` plus `pick`
- single-skill repo: omit `subdir`

## Removing skills

- local: delete the skill directory
- external: remove the flake input and source entry

## Apply changes

```bash
git add flake.nix nix/modules/homemanager/agents.nix
gob run dev nix switch
```

Skill names must be unique across local and external sources.
