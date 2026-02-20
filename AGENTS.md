# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Overview

Multi-platform dotfiles repository using Nix as the primary configuration system.

**Hosts:** See `nix/hosts/`

**Architecture:**
- **Primary**: Nix flakes + Home Manager + nix-darwin
- **Secondary**: GNU Stow for dotfiles not managed by Nix

## Directory Structure

- `nix/` - Primary system configuration
  - `hosts/` - Host-specific configs
  - `modules/` - Reusable Nix modules
  - `secrets/` - Encrypted secrets (agenix)
- `dotfiles/` - Traditional dotfiles (GNU Stow)
- `cli/` - Custom `dev` CLI tool
- `assets/` - Shared resources (ZSH configs, wallpapers)

## Dotfiles (GNU Stow)

Each subdirectory under `dotfiles/` is a stow package. The directory structure inside each package mirrors `$HOME`, so `dotfiles/git/.gitconfig` becomes `~/.gitconfig`. Running `make` links all packages.

Key packages:
- `aerospace/` - AeroSpace window manager (`.config/aerospace/`)
- `agents/` - Global agent skills (`~/.agents/`)
- `claude/` - Claude Code config (`~/.claude/`)
- `ghostty/` - Ghostty terminal (`.config/ghostty/`)
- `git/` - Git config (`.gitconfig`, `.gitignore`, `.gitattributes`)
- `karabiner/` - Karabiner-Elements key remapping (`.config/karabiner/`)
- `nvim/` - Neovim config (`.config/nvim/`)
- `pi/` - Pi agent config and extensions (`.pi/agent/`)
- `tmux/` - Tmux config (`.tmux.conf`, `.config/tmux/`)
- `yazi/` - Yazi file manager (`.config/yazi/`)
- `zsh/` - Zsh config (`.zshrc`, `.zshenv`)

Other packages: `aider`, `alsa`, `asdf`, `aws`, `bin`, `ctags`, `cursor`, `lazygit`, `mcpli`, `mise`, `npm`, `rclone`, `rubygems`, `starship`, `vim`, `vscode`, `xorg`

A `.skipstow` file inside a package directory excludes it from stow linking.

## Neovim

Shortcuts: `dotfiles/nvim/.config/nvim/lua/shortcuts.lua`

## dev CLI

Commands live in `cli/libexec/`. Use lowercase with hyphens.

Document according to `juanibiapina/sub`:
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

## Installing Software

**macOS (Homebrew):**
- Shared across all Macs: `nix/modules/macos/system.nix`
- Host-specific: `nix/hosts/<host>/configuration.nix`

Then stage files and run `dev nix switch`.

## Pi Extensions

Extensions live in `dotfiles/pi/.pi/agent/extensions/`.

## Applying Changes

- **Nix configs**: `gob run dev nix switch` (stage new files first)
- **Dotfiles**: `gob run make`
