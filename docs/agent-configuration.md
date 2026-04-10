# Agent Configuration

How agent skills, prompts, and extensions are managed in this dotfiles repo.

## Skills

### Own skills

`agents/skills/<name>/SKILL.md`

Own skills live in `agents/skills/`, following the [skills.sh](https://skills.sh) convention inside this repo.

Skills follow the [Agent Skills](https://agentskills.io) open standard. They are discovered by pi, Cursor, Claude Code, and any tool that reads `~/.agents/skills/`.

Nix Home Manager creates per-skill symlinks in `~/.agents/skills/`, configured in `nix/modules/homemanager/agents.nix`. Own skills use `mkOutOfStoreSymlink`, pointing directly at the repo directory. Content edits take effect immediately. Adding or removing a skill requires `dev nix switch` (skills are auto-discovered via `builtins.readDir`).

### Third-party skills

Third-party skills are pulled from external repos via Nix flake inputs and point to read-only Nix store paths. Update them with `nix flake update <input-name>` followed by `dev nix switch`.

Declared as `flake = false` inputs in `flake.nix`:

| Input | Repo | Layout |
|-------|------|--------|
| `slavingia-skills` | [slavingia/skills](https://github.com/slavingia/skills) | Flat: `skills/<name>/SKILL.md` (auto-discovered) |
| `superpowers-skills` | [obra/superpowers](https://github.com/obra/superpowers) | Flat: `skills/<name>/SKILL.md` (auto-discovered) |
| `impeccable-skills` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Flat: `.agents/skills/<name>/SKILL.md` (auto-discovered) |
| `last30days-skill` | [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) | Single-skill: `SKILL.md` at repo root |
| `shadcn-ui-skills` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | Flat: `skills/<name>/SKILL.md` (auto-discovered) |
| `agent-skills-library` | [christophacham/agent-skills-library](https://github.com/christophacham/agent-skills-library) | Nested: `skills/<category>/<name>/` (cherry-picked) |
| `cloudflare-skill` | [dmmulroy/cloudflare-skill](https://github.com/dmmulroy/cloudflare-skill) | Flat: `skills/<name>/SKILL.md` (auto-discovered) |

### Adding a new third-party skill repo

1. Add a `flake = false` input in `flake.nix`
2. Add a source entry in `nix/modules/homemanager/agents.nix`
3. Run `dev nix switch`

Source types:

```nix
# Auto-discover all skills under a subdirectory
source-name = { src = inputs.repo-name; subdir = "skills"; };

# Single-skill repo (SKILL.md at repo root)
source-name = { src = inputs.repo-name; };

# Cherry-pick specific skills from a nested repo
source-name = {
  src = inputs.repo-name;
  subdir = "skills";
  pick = [ "category/skill-name" ];
};
```

Duplicate skill names across sources produce a build error (not a silent override).

### The agent-skills module

The module is defined in `nix/modules/homemanager/agent-skills.nix` and configured in `agents.nix`. It provides:

- **Auto-discovery**: Sources without `pick` install all skill directories found under `subdir`.
- **Cherry-picking**: Sources with `pick` install only the listed paths (installed name is the last path component).
- **Single-skill repos**: Sources without `subdir` treat the entire repo as one skill named after the source key.
- **Collision detection**: Duplicate skill names across sources or between own and external skills fail the build.
- **Own skills**: `ownSkillsDir` creates live symlinks via `mkOutOfStoreSymlink` for instant editing.

## Pi-specific config

`dotfiles/pi/.pi/agent/`

Contains everything pi discovers from `~/.pi/agent/`:

- `prompts/`: prompt templates (e.g. `/verify`, `/plan`, `/capture-skill`)
- `extensions/`: TypeScript extensions (e.g. `fold.ts`, `stash.ts`)
- `settings.json`, `keybindings.json`: pi configuration

This is a GNU Stow package. Run `make` to re-link after adding or removing files.

## Directory Layout

```
agents/
└── skills/                    # Own skills (skills.sh convention)
    ├── browse/SKILL.md
    ├── git-commit/SKILL.md
    ├── notes/SKILL.md
    ├── todo/SKILL.md
    ├── web-search/SKILL.md
    └── ...
dotfiles/
└── pi/
    └── .pi/
        └── agent/
            ├── AGENTS.md
            ├── prompts/
            ├── extensions/
            └── settings.json
```

## How to Add Things

### New skill (shared, cross-tool)

1. Create `agents/skills/<name>/SKILL.md`
2. Run `dev nix switch`

The `SKILL.md` frontmatter must include `name` and `description`. Optional subdirectories: `scripts/`, `references/`, `assets/`.

### New third-party skill repo

See [Adding a new third-party skill repo](#adding-a-new-third-party-skill-repo) above.

### New prompt template (pi-specific)

1. Create `dotfiles/pi/.pi/agent/prompts/<name>.md`
2. Run `make` to stow-link it

### New extension (pi-specific)

1. Create `dotfiles/pi/.pi/agent/extensions/<name>.ts`
2. Run `make` to stow-link it

## The AGENTS.md File

`AGENTS.md` at the repo root is the agent instruction file, read automatically by pi (and other tools that support it) when working in this repo. It provides repository-specific guidance: directory structure, conventions, how to apply changes, etc.

Some tools look for `CLAUDE.md` instead. If needed, a symlink `CLAUDE.md -> AGENTS.md` can bridge this.

## Applying Changes

| What changed | Command |
|-------------|---------|
| Edit existing skill content | Nothing (live via `mkOutOfStoreSymlink`) |
| Add/remove own skill | `dev nix switch` |
| Add third-party skill repo | Update `flake.nix` + `agents.nix`, then `dev nix switch` |
| Update third-party skills | `nix flake update <input-name>`, then `dev nix switch` |
| Files in `pi/` | `make` (re-runs stow) |
| Nix module (`agents.nix`) | `dev nix switch` |
