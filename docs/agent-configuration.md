# Agent Configuration

How agent skills, prompts, and extensions are managed in this dotfiles repo.

## Two Stow Packages

Agent configuration is split across two stow packages under `dotfiles/`:

| Package | Targets | What it contains |
|---------|---------|-----------------|
| `agents/` | `~/.agents/` | Shared skills (cross-tool, tool-agnostic) |
| `pi/` | `~/.pi/agent/` | Pi-specific config: prompts, extensions, settings |

### `agents/` — shared skills

`dotfiles/agents/.agents/skills/<name>/SKILL.md`

Skills here follow the [Agent Skills](https://agentskills.io) open standard. They are discovered by pi, Cursor, Claude Code, and any tool that reads `~/.agents/skills/`.

This package has a `.skipstow` file — it is **not** linked by `make` / GNU Stow. Instead, Nix Home Manager creates a single symlink:

```
~/.agents → dotfiles/agents/.agents
```

Configured in `nix/modules/homemanager/agents.nix` using `mkOutOfStoreSymlink`, which points directly at the repo directory. Changes to skills take effect immediately — no rebuild or re-link needed.

### `pi/` — pi-specific config

`dotfiles/pi/.pi/agent/`

Contains everything pi discovers from `~/.pi/agent/`:

- `prompts/` — prompt templates (e.g. `/verify`, `/plan`, `/capture-skill`)
- `extensions/` — TypeScript extensions (e.g. `fold.ts`, `stash.ts`)
- `settings.json`, `keybindings.json` — pi configuration

This package **is** managed by GNU Stow. Run `make` to re-link after adding or removing files.

## Directory Layout

```
dotfiles/
├── agents/
│   ├── .skipstow              # excluded from stow; Nix-symlinked instead
│   └── .agents/
│       └── skills/
│           ├── browse/SKILL.md
│           ├── git-commit/SKILL.md
│           ├── notes/SKILL.md
│           ├── todo/SKILL.md
│           ├── web-search/SKILL.md
│           └── ...
└── pi/
    └── .pi/
        └── agent/
            ├── AGENTS.md
            ├── prompts/
            │   ├── plan.md
            │   ├── verify.md
            │   ├── capture-skill.md
            │   └── ...
            ├── extensions/
            │   ├── fold.ts
            │   ├── stash.ts
            │   └── ...
            └── settings.json
```

## How to Add Things

### New skill (shared, cross-tool)

1. Create `dotfiles/agents/.agents/skills/<name>/SKILL.md`
2. That's it — the Nix symlink makes it live immediately

Skills use a directory structure. The `SKILL.md` frontmatter must include `name` and `description`. Optional subdirectories: `scripts/`, `references/`, `assets/`.

### New prompt template (pi-specific)

1. Create `dotfiles/pi/.pi/agent/prompts/<name>.md`
2. Run `make` to stow-link it

### New extension (pi-specific)

1. Create `dotfiles/pi/.pi/agent/extensions/<name>.ts`
2. Run `make` to stow-link it

## The AGENTS.md File

`AGENTS.md` at the repo root is the agent instruction file — read automatically by pi (and other tools that support it) when working in this repo. It provides repository-specific guidance: directory structure, conventions, how to apply changes, etc.

Some tools look for `CLAUDE.md` instead. If needed, a symlink `CLAUDE.md → AGENTS.md` can bridge this.

## Applying Changes

| What changed | Command |
|-------------|---------|
| Files in `agents/` | Nothing — live via Nix symlink |
| Files in `pi/` | `make` (re-runs stow) |
| Nix module (`agents.nix`) | `dev nix switch` |
