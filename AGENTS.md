# AGENTS.md

Juan's dotfiles for the macOS and NixOS hosts in `nix/hosts/`. Nix flakes with Home Manager and nix-darwin configure the systems; GNU Stow links the packages under `dotfiles/`.

- Apply every change with `gob run make`. Stage new files first: the flake only sees files tracked by git.
- A Stow package mirrors `$HOME`: `dotfiles/git/.gitconfig` becomes `~/.gitconfig`. A `.skipstow` file excludes a package.
- Homebrew software for every Mac goes in `nix/modules/macos/system.nix`; for one Mac, in `nix/hosts/<host>/configuration.nix`.
- `dev` commands live in `cli/libexec/`, named in lowercase with hyphens, with this header:

  ```bash
  #!/usr/bin/env bash
  #
  # Summary: Brief one-line description
  #
  # Usage: {cmd} [options] <arguments>

  set -e

  declare -A args="($_DEV_ARGS)"
  # Access: ${args[argname]}
  ```

- Agent skills, prompts, and pi config: [docs/agent-configuration.md](docs/agent-configuration.md).
- Before Herdr work, read `~/.config/herdr-app/AGENTS.md` on a Mac and [docs/herdr.md](docs/herdr.md).
- Runbooks for hosts and services are in [docs/](docs/).
