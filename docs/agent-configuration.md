# Agent Configuration

How agent skills, prompts, and extensions are managed in this dotfiles repo.

## Skills

### Own skills

`agents/skills/<name>/SKILL.md`

Own skills live in `agents/skills/`, following the [skills.sh](https://skills.sh) convention inside this repo.

Skills follow the [Agent Skills](https://agentskills.io) open standard. They are discovered by pi, Cursor, Claude Code, and any tool that reads `~/.agents/skills/`.

Nix Home Manager creates per-skill symlinks in `~/.agents/skills/`, configured in `nix/modules/homemanager/agents.nix`. Own skills use `mkOutOfStoreSymlink`, pointing directly at the repo directory. Content edits take effect immediately. Adding or removing a skill requires `gob run make` (skills are auto-discovered via `builtins.readDir`).

Some own skills are vendored or adapted from an external repository so they remain editable. Put the pinned source URL, imported commit, license, and copyright immediately after the `SKILL.md` frontmatter. Keep the upstream license in the skill directory and copy all resources the skill references. Updates are manual: compare the recorded commit with the new upstream revision, preserve local adaptations, then update the source tag.

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

### Contentful work skills

On the `macr` work host, Agents Kit owns the Contentful developer bundle and the
skills published in the private `ninetailed-inc/skills` repository. Install or
update them with:

```sh
dev agents install-contentful-skills
```

The command keeps its config, package dependencies, generated skill copies, and
install manifest under `~/.agents-kit`. It fetches private packages and GitHub
sources at runtime, so no private source is a Nix flake input. Authenticate the
GitHub CLI for private repository access and configure a token with
`read:packages` for GitHub Packages in your global npm config before running it.

Four Ninetailed skills are copies of personal skills in this repository. The
`macr` Home Manager config lists them in `excludedOwnSkills`, leaving Agents Kit
as their only owner on that host. Other hosts keep the personal copies. Run
`gob run make` before the installer after changing that exclusion list.

The installer targets both `~/.agents/skills` and `~/.claude/skills`, uses
symlink mode, preserves unrelated Agents Kit sources, and is safe to rerun. If a
Home Manager activation replaces one of the work links, rerun `gob run make`
and then rerun the installer.

### The agent-skills module

The module is defined in `nix/modules/homemanager/agent-skills.nix` and configured in `agents.nix`. It provides:

- **Auto-discovery**: Sources without `pick` install all skill directories found under `subdir`.
- **Cherry-picking**: Sources with `pick` install only the listed paths (installed name is the last path component).
- **Single-skill repos**: Sources without `subdir` treat the entire repo as one skill named after the source key.
- **Collision detection**: Duplicate skill names across sources or between own and external skills fail the build.
- **Own skills**: `ownSkillsDir` creates live symlinks via `mkOutOfStoreSymlink` for instant editing.
- **Host exclusions**: `excludedOwnSkills` leaves named own skills for another installer and validates that each excluded name exists.

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
- `models.json`: custom provider and model definitions
- `AGENTS.md` and related runtime files

Pi loads `AGENTS.md` files in the session cwd and its ancestors at startup. The `extensions/subdir-agents.ts` extension lazily adds nested `AGENTS.md` files after a successful built-in Read below the cwd. It adds instructions parent-to-child once per session, including across `/reload` and resume. It ignores direct `AGENTS.md` reads and paths outside the cwd. Bash, Edit, Write, Grep, Find, and Ls operations do not trigger it.

### Contentful AI Gateway

Contentful workspaces set `CODING_AGENT=pi-contentful`. The launcher selects Sonnet from the `contentful-ai-gateway` provider defined in `models.json`. The same provider exposes supported Claude and GPT models through `https://ai-gateway.contentful.tools/`.

The launcher passes its own `--models` scope so Ctrl+P cycles through gateway models only. Normal `pi` uses the personal model scope from global `enabledModels`, which excludes gateway models.

Authentication comes from `CONTENTFUL_AI_GATEWAY_KEY` in the environment; Pi configuration does not contain the key. It is only for interactive AI-assisted engineering tools, not application code, automated pipelines, or programmatic model calls.

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

Storage is project-root-scoped and invisible to git. Files live under `$XDG_STATE_HOME/pi-artifacts/<hash>/` (default `~/.local/state`), where `<hash>` is a short sha256 of the project root (git top-level, falling back to the cwd when not in a repo). Because the hash is over the repo root, sessions started in a subdirectory share the same artifacts. The filesystem is the source of truth: the set of artifacts is whatever non-dotfiles exist in the directory. A `.index.json` sidecar holds optional per-file `title`/`type` enrichment only; `updatedAt` always comes from filesystem mtime.

The artifact model lives in `dev artifacts`, not the extension: location, naming, containment, sidecar updates, membership, ordering, and age all come from the CLI. Pi requires `dev` and its `sub` dependency on PATH. The extension resolves the destination, writes content to a private temp file because `pi.exec` has no stdin, then calls the CLI inside pi's per-file mutation queue. A lookup or write failure is reported to the agent as a failure, never as an empty project.

Three tools are exposed:

- `artifact_save` — `{ name, content, title?, type? }`. Calls `dev artifacts save` and returns its absolute path. Used for initial creation and full rewrites.
- `artifact_list` — reads exact JSON records from `dev artifacts list --format=json` and formats them for the agent.
- `artifact_delete` — `{ name }`. Calls `dev artifacts delete`.

For incremental updates the agent edits the returned path directly with the normal `Read`/`Write`/`Edit` tools; there is no dedicated update tool. On session start, if artifacts already exist, the extension injects a one-time listing (with paths) so the agent knows they're available. A persistent marker entry prevents the listing from being duplicated on `/reload` or resume.

`dev artifacts list` and `prefix e` consume the same store (`cli/libexec/artifacts/`). See that directory's README for the storage and failure contracts.

## Directory Layout

```
agents/
├── prompts/                   # Repo-owned prompt templates shared by pi and Claude
│   ├── plan.md
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
