# Agent Configuration

How agent skills, prompts, and extensions are managed in this dotfiles repo.

## Skills

### Own skills

`skills/<name>/SKILL.md`

Own skills live at the repo root in the `skills/` directory, following the [skills.sh](https://skills.sh) convention. Anyone can install them with:

```
npx skills add juanibiapina/dotfiles
```

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
| `ai-product-toolkit` | [TechNomadCode/AI-Product-Development-Toolkit](https://github.com/TechNomadCode/AI-Product-Development-Toolkit) | Wrapped: no `SKILL.md`, Nix generates wrappers (see [below](#wrapped-skill-repos)) |
| `shadcn-ui-skills` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | Flat: `skills/<name>/SKILL.md` (auto-discovered) |
| `agent-skills-library` | [christophacham/agent-skills-library](https://github.com/christophacham/agent-skills-library) | Nested: `skills/<category>/<name>/` (explicit entries) |

To add a new third-party skill repo, add a flake input and wire it into `agents.nix`. Flat repos auto-discover via `builtins.readDir`. Single-skill repos need an explicit entry. Wrapped repos need derivations that generate SKILL.md files (see [Wrapped skill repos](#wrapped-skill-repos)).

## Pi-specific config

`dotfiles/pi/.pi/agent/`

Contains everything pi discovers from `~/.pi/agent/`:

- `prompts/`: prompt templates (e.g. `/verify`, `/plan`, `/capture-skill`)
- `extensions/`: TypeScript extensions (e.g. `fold.ts`, `stash.ts`)
- `settings.json`, `keybindings.json`: pi configuration

This is a GNU Stow package. Run `make` to re-link after adding or removing files.

## Directory Layout

```
skills/                        # Own skills (skills.sh convention)
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

1. Create `skills/<name>/SKILL.md`
2. Run `dev nix switch`

The `SKILL.md` frontmatter must include `name` and `description`. Optional subdirectories: `scripts/`, `references/`, `assets/`.

### New third-party skill repo

1. Add a `flake = false` input in `flake.nix`
2. Add entries in `nix/modules/homemanager/agents.nix`
3. Run `dev nix switch`

See [Wrapped skill repos](#wrapped-skill-repos) if the repo does not have `SKILL.md` files.

### New prompt template (pi-specific)

1. Create `dotfiles/pi/.pi/agent/prompts/<name>.md`
2. Run `make` to stow-link it

### New extension (pi-specific)

1. Create `dotfiles/pi/.pi/agent/extensions/<name>.ts`
2. Run `make` to stow-link it

## The AGENTS.md File

`AGENTS.md` at the repo root is the agent instruction file, read automatically by pi (and other tools that support it) when working in this repo. It provides repository-specific guidance: directory structure, conventions, how to apply changes, etc.

Some tools look for `CLAUDE.md` instead. If needed, a symlink `CLAUDE.md -> AGENTS.md` can bridge this.

## Wrapped skill repos

Some third-party repos contain useful prompt templates or instructions but do not follow the `SKILL.md` convention. For these, `agents.nix` builds wrapper derivations that combine the original repo content with a generated `SKILL.md`.

The pattern in `agents.nix`:

1. **`mkToolkitSkill`** takes a skill name and a definition (`dir`, `description`, `body`).
2. It writes a `SKILL.md` with proper frontmatter from the definition.
3. It copies the original repo subdirectory contents into the output alongside `SKILL.md`.
4. The result is a Nix store path that looks like a normal skill directory.

To add a wrapped skill repo:

1. Add a `flake = false` input in `flake.nix`
2. In `agents.nix`, define a skill entry per subdirectory with `dir` (repo subdirectory), `description` (frontmatter), and `body` (SKILL.md content as a list of lines)
3. Wire the skills into `externalSkills`
4. Run `dev nix switch`

## Applying Changes

| What changed | Command |
|-------------|---------|
| Edit existing skill content | Nothing (live via `mkOutOfStoreSymlink`) |
| Add/remove own skill | `dev nix switch` |
| Add third-party skill repo | Update `flake.nix` + `agents.nix`, then `dev nix switch` |
| Update third-party skills | `nix flake update <input-name>`, then `dev nix switch` |
| Files in `pi/` | `make` (re-runs stow) |
| Nix module (`agents.nix`) | `dev nix switch` |
