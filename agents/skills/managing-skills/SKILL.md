---
name: managing-skills
description: >
  Use when adding, installing, removing, or managing agent skills in this dotfiles repo.
  Triggers on "add skill", "install skill", "remove skill", "delete skill", "new skill",
  "manage skills", or any skill management task.
---

# Managing Skills

Two kinds: **own** (local, editable) and **external** (from GitHub repos, read-only in nix store).

Files involved:
- `agents/skills/` - own skills directory
- `flake.nix` - flake inputs for external sources
- `nix/modules/homemanager/agents.nix` - source wiring

All skills end up at `~/.agents/skills/<name>/`.

## Own Skills

Create dir under `agents/skills/` with `SKILL.md`. Own skills get live symlinks back to repo (editable without rebuild).

```
agents/skills/my-skill/SKILL.md
```

Stage new files, run `dev nix switch`.

## External Skills

Add flake input in `flake.nix`, wire source in `agents.nix`. Three patterns:

### All skills from repo

Repo has `skills/` dir with multiple skill subdirs.

```nix
# flake.nix
caveman-skill = { url = "github:JuliusBrussee/caveman"; flake = false; };

# agents.nix sources
caveman = { src = inputs.caveman-skill; subdir = "skills"; };
```

### Cherry-pick from repo

Repo has nested skill dirs. Pick specific ones by relative path under subdir. Installed name is last path component.

```nix
# agents.nix sources
agent-library = {
  src = inputs.agent-skills-library;
  subdir = "skills";
  pick = [
    "design/radix-ui-design-system"
    "business/seo-audit"
  ];
};
```

### Single skill (no subdir)

Entire repo is one skill. Attribute name becomes skill name.

```nix
# flake.nix
last30days-skill = { url = "github:mvanhorn/last30days-skill"; flake = false; };

# agents.nix sources
last30days = { src = inputs.last30days-skill; };
```

## Removing Skills

**Own:** delete dir from `agents/skills/`.
**External:** remove flake input from `flake.nix` and source entry from `agents.nix`.

## Applying Changes

```bash
git add flake.nix nix/modules/homemanager/agents.nix  # stage new/changed files
gob run dev nix switch
```

Own skill names must not collide with external skill names (build will fail).
