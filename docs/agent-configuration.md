# Agent Configuration

How agent skills, prompts, and extensions are managed in this dotfiles repo.

## Skills

### Own skills

`agents/skills/<name>/SKILL.md`

Own skills live in `agents/skills/`, following the [skills.sh](https://skills.sh) convention inside this repo.

Skills follow the [Agent Skills](https://agentskills.io) open standard. They are discovered by pi, Cursor, Claude Code, and any tool that reads `~/.agents/skills/`.

Nix Home Manager creates per-skill symlinks in `~/.agents/skills/`, configured in `nix/modules/homemanager/agents.nix`. Own skills use `mkOutOfStoreSymlink`, pointing directly at the repo directory. Content edits take effect immediately. Adding or removing a skill requires `gob run make` (skills are auto-discovered via `builtins.readDir`).

### Third-party skills

Third-party skills are pulled from external repos via Nix flake inputs and point to read-only Nix store paths. Update them with `nix flake update <input-name>` followed by `gob run make`.

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
3. Run `gob run make`

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

## Prompt templates and Claude commands

Repo-owned prompt files live in `agents/prompts/`.

Home Manager deploys each `agents/prompts/*.md` file to both:

- `~/.pi/agent/prompts/*.md` for pi prompt templates
- `~/.claude/commands/*.md` for Claude commands

Both targets use `mkOutOfStoreSymlink`, so content edits take effect immediately. Adding or removing a prompt file requires `gob run make`.

## Pi-specific config

Pi runtime files under `~/.pi/agent/` also include:

- `dotfiles/pi/.pi/agent/`: pi runtime config still managed by GNU Stow

The Stow-managed pi package now contains:

- `extensions/`: TypeScript extensions (e.g. `branch.ts`, `stash.ts`)
- `settings.json`, `keybindings.json`: pi configuration
- `AGENTS.md` and related runtime files

### Personal pi extensions

The four personal `@juanibiapina/*` pi packages are deployed from flake inputs pinned by `flake.lock`, not from `npm:` entries in `settings.json`. Each is symlinked into a stable `~/.pi/agent/pi-packages/<name>`, and `settings.json` `packages` references them by `~`-path (portable across hosts with different usernames). This removes version ambiguity: the loaded version is whatever `flake.lock` pins.

| Package | Input | Deploy |
|---------|-------|--------|
| `pi-gob` | `pi-gob` | source symlink |
| `pi-extension-settings` | `pi-extension-settings` | source symlink |
| `pi-tokyonight` | `pi-tokyonight` | source symlink (satisfies `"theme": "tokyonight-moon"`) |
| `pi-powerbar` | `pi-powerbar` (+ `pi-extension-settings`, `pi-usage`) | assembly derivation |

Wiring lives in `nix/modules/homemanager/pi-extensions.nix`, imported by each host's `home-manager.nix` next to `deltoids.nix`. The three dependency-free packages are plain source symlinks (deltoids pattern). Powerbar imports two sibling packages as libraries at runtime (`getSetting` from `pi-extension-settings`, and `pi-usage` via its manifest), and pi does not run `npm install` for local packages, so an assembly derivation copies powerbar and symlinks those two siblings under its `node_modules` from their own pinned inputs. Both siblings export TypeScript source (jiti runs it) and have no third-party runtime deps, so no npm build or dependency fetch is involved.

Bump flow: `nix flake update <input>` then `gob run make`. Bump powerbar and its libs together with `nix flake update pi-powerbar pi-extension-settings pi-usage`.

### Artifacts extension

`extensions/artifacts.ts` lets the agent persist named files ("artifacts", e.g. a plan or a set of notes) that live outside the git repo and survive across pi sessions. Any session in the same project can create, read, and update them.

Storage is project-root-scoped and invisible to git. Files live under `<tmpdir>/pi-artifacts/<hash>/`, where `<hash>` is a short sha256 of the project root (git top-level, falling back to the cwd when not in a repo). Because the hash is over the repo root, sessions started in a subdirectory share the same artifacts. The filesystem is the source of truth: the set of artifacts is whatever non-dotfiles exist in the directory. A `.index.json` sidecar holds optional per-file `title`/`type` enrichment only; `updatedAt` always comes from filesystem mtime.

Three tools are exposed:

- `artifact_save` — `{ name, content, title?, type? }`. Slugifies `name` into a safe filename (default `.md`), writes the content, records optional `title`/`type`, and returns the absolute path. Used for initial creation and full rewrites.
- `artifact_list` — lists artifacts with type/title, relative age, and absolute path.
- `artifact_delete` — `{ name }`. Removes the file and its sidecar entry.

For incremental updates the agent edits the returned path directly with the normal `Read`/`Write`/`Edit` tools; there is no dedicated update tool. Writes go through pi's per-file mutation queue so they don't clobber a concurrent `edit` on the same file. Names are slugified and path-traversal is contained inside the sandbox directory.

On session start, if artifacts already exist, the extension injects a one-time listing (with paths) so the agent knows they're available. A persistent marker entry prevents the listing from being duplicated on `/reload` or resume.

Tradeoff: `os.tmpdir()` can be cleared on reboot, so artifacts are not permanent. If longer persistence is wanted, only the base directory needs to change (e.g. an XDG state dir).

## Directory Layout

```
agents/
├── prompts/                   # Repo-owned prompt templates shared by pi and Claude
│   ├── plan.md
│   ├── verify.md
│   ├── research.md
│   └── ...
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
            ├── extensions/
            └── settings.json
```

## How to Add Things

### New skill (shared, cross-tool)

1. Create `agents/skills/<name>/SKILL.md`
2. Run `gob run make`

The `SKILL.md` frontmatter must include `name` and `description`. Optional subdirectories: `scripts/`, `references/`, `assets/`.

### New third-party skill repo

See [Adding a new third-party skill repo](#adding-a-new-third-party-skill-repo) above.

### New prompt template or Claude command

1. Create `agents/prompts/<name>.md`
2. Run `gob run make`

That one file becomes both `/name` in pi and `/name` in Claude.

### New extension (pi-specific)

1. Create `dotfiles/pi/.pi/agent/extensions/<name>.ts`
2. Run `gob run make` to stow-link it

## The AGENTS.md File

`AGENTS.md` at the repo root is the agent instruction file, read automatically by pi (and other tools that support it) when working in this repo. It provides repository-specific guidance: directory structure, conventions, how to apply changes, etc.

Some tools look for `CLAUDE.md` instead. If needed, a symlink `CLAUDE.md -> AGENTS.md` can bridge this.

## Applying Changes

| What changed | Command |
|-------------|---------|
| Edit existing skill content | Nothing (live via `mkOutOfStoreSymlink`) |
| Add/remove own skill | `gob run make` |
| Add third-party skill repo | Update `flake.nix` + `agents.nix`, then `gob run make` |
| Update third-party skills | `nix flake update <input-name>`, then `gob run make` |
| Edit existing prompt or Claude command content | Nothing at runtime after activation (live via `mkOutOfStoreSymlink`) |
| Add/remove prompt template or Claude command | `gob run make` |
| Stow-managed files in `dotfiles/pi/` | `gob run make` |
| Nix modules (`agents.nix`, `agent-skills.nix`) | `gob run make` |
