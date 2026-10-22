# Agent Configuration

How agent skills, prompts, extensions, and MCP servers are set up and deployed from this repo.

## Skills

Skills follow the [Agent Skills](https://agentskills.io) standard: a directory with a `SKILL.md` whose frontmatter has `name` and `description`, plus optional `scripts/`, `references/`, and `assets/`. Home Manager links every skill into `~/.agents/skills/`, which pi, Claude Code, and other tools read, and mirrors them to `~/.claude/skills/`.

The `agent-skills` module (`nix/modules/homemanager/agent-skills.nix`) does the linking. Its configuration, including every skill source, lives in `nix/modules/homemanager/agents.nix`. Duplicate skill names fail the build.

### Own skills

Own skills live in `agents/skills/<name>/SKILL.md` and are discovered automatically. They are linked with `mkOutOfStoreSymlink`, so content edits take effect immediately. Adding or removing a skill needs `gob run make`.

### Third-party skills

Third-party skills come from repos declared as `flake = false` inputs in `flake.nix`, each with a source entry in `agents.nix`:

```nix
# Every skill directory under a subdirectory
source-name = { src = inputs.repo-name; subdir = "skills"; };

# Only the listed skills (installed under the last path component)
source-name = { src = inputs.repo-name; subdir = "skills"; pick = [ "category/skill-name" ]; };

# A repo whose root is one skill, named after the source key
source-name = { src = inputs.repo-name; };
```

Prefer `pick` when a repo ships skills you don't need. When a skill documents a CLI, take the CLI and the skill from the same pinned input so they stay in sync.

## Prompt templates

Prompt files live in `agents/prompts/<name>.md`. Home Manager links each one to `~/.pi/agent/prompts/` and `~/.claude/commands/`, so one file becomes `/name` in both pi and Claude Code. Edits take effect immediately; adding or removing a file needs `gob run make`.

## Pi

Pi's runtime configuration is the Stow package `dotfiles/pi/.pi/agent/`:

- `SYSTEM.md`: the system prompt with the global instructions
- `settings.json`, `keybindings.json`: pi settings
- `models.json`: custom providers and models
- `mcp.json`: user-level MCP servers
- `extensions/`: local TypeScript extensions

Pi packages built from flake inputs are linked by `nix/modules/homemanager/pi-extensions.nix` under `~/.pi/agent/pi-packages/<name>`, and `settings.json` loads them from there. Pi does not install dependencies for local packages, so a package that needs other packages at runtime is assembled by a derivation that places them under its `node_modules`.

## Claude Code

The `claude` CLI comes from the `claude-code` flake input and is installed by `nix/modules/base.nix`. `~/.claude/settings.json` is Stow-managed from `dotfiles/claude/` and stays writable because Claude writes to it. Skills and commands come from Home Manager as described above.

## AGENTS.md

`AGENTS.md` holds instructions for agents working in a directory. Pi and other tools load it from the working directory and its ancestors at the start of a session. Tools that look for `CLAUDE.md` can use a symlink to `AGENTS.md`.

## Where agent documents live

Plans are saved per session with `save_plan`. Research and investigations go in the target repo under `docs/investigations/<name>.md`.

## Applying changes

| Change | Command |
|---|---|
| Edit an own skill or prompt | Nothing; links are live |
| Add or remove an own skill or prompt | `gob run make` |
| Add a third-party skill repo | Add the input to `flake.nix` and a source to `agents.nix`, then `gob run make` |
| Update a flake input (skills, CLIs, pi packages) | `nix flake update <input>`, then `gob run make` |
| Stow-managed files (`dotfiles/pi/`, `dotfiles/claude/`) | `gob run make` |

Stage new files before `gob run make`; the flake only sees files tracked by git.
