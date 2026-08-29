# AGENTS.md

Guidance for coding agents working with this repository. See [docs/agent-configuration.md](docs/agent-configuration.md) for how agent skills, prompts, and extensions are structured and deployed.

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
- `agents/skills/` - Agent skills (follows [skills.sh](https://skills.sh) convention)
- `agents/prompts/` - Prompt templates shared by pi and Claude
- `dotfiles/` - Traditional dotfiles (GNU Stow)
- `cli/` - Custom `dev` CLI tool
- `assets/` - Shared resources (ZSH configs, wallpapers)

## Dotfiles (GNU Stow)

Each subdirectory under `dotfiles/` is a stow package. The directory structure inside each package mirrors `$HOME`, so `dotfiles/git/.gitconfig` becomes `~/.gitconfig`. Running `make` links all packages.

Key packages:
- `aerospace/` - AeroSpace window manager (`.config/aerospace/`)
- `claude/` - Claude Code config (`~/.claude/`, command files come from `agents/prompts/`)
- `ghostty/` - Ghostty terminal (`.config/ghostty/`)
- `git/` - Git config (`.gitconfig`, `.gitignore`, `.gitattributes`)
- `karabiner/` - Karabiner-Elements key remapping (`.config/karabiner/`)
- `nvim/` - Neovim config (`.config/nvim/`)
- `pi/` - Pi agent runtime config and extensions (`.pi/agent/`)
- `tmux/` - Tmux config (`.tmux.conf`, `.config/tmux/`)
- `yazi/` - Yazi file manager (`.config/yazi/`)
- `zsh/` - Zsh config (`.zshrc`, `.zshenv`)

Other packages: `aider`, `alsa`, `asdf`, `aws`, `bin`, `ctags`, `cursor`, `lazygit`, `mcpli`, `mise`, `npm`, `rclone`, `rubygems`, `starship`, `vim`, `vscode`, `xorg`

A `.skipstow` file inside a package directory excludes it from stow linking.

## Neovim

Shortcuts: `dotfiles/nvim/.config/nvim/lua/shortcuts.lua`

## Android dev shell (mini)

`nix/shells/android.nix` (flake output `devShells.x86_64-linux.android`) provides
the Android build toolchain for the Expo app in `juanibiapina/zero`
(`apps/agent-mobile`): SDK platform 36, build-tools 36.0.0, NDK 27.1.12297006,
cmake 3.22.1, JDK 17 — the exact versions Expo SDK 57 / React Native 0.86 pin. It
sets `ANDROID_HOME`/`ANDROID_SDK_ROOT`/`ANDROID_NDK_ROOT`/`JAVA_HOME` and the
`GRADLE_OPTS` `aapt2FromMavenOverride` that makes gradle use the Nix-store `aapt2`
(the downloaded one cannot run on NixOS). It is a **dev shell**, so it needs no
`nixos-rebuild`. Use it to build a standalone APK on `mini` when the EAS quota is
exhausted:

```bash
export NIXPKGS_ACCEPT_ANDROID_SDK_LICENSE=1
nix develop ~/workspace/juanibiapina/dotfiles#android --command bash -c '
  cd ~/workspace/juanibiapina/zero/apps/agent-mobile
  eas build --platform android --profile preview --local --non-interactive \
    --output /tmp/local-preview.apk'
```

The `mini` host's `nix/hosts/mini/modules/android.nix` separately ships adb +
maestro for driving the USB-attached Pixel 7.

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

Then stage files and run `gob run make`.

## Pi Extensions

Extensions live in `dotfiles/pi/.pi/agent/extensions/`.

## Applying Changes

Run `gob run make` to apply everything (stow links, vim plugins, and nix switch). Stage new files first.
