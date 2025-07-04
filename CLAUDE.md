# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a multi-platform dotfiles repository built around Nix as the primary configuration management system.
It supports 4 hosts: `desktop`, `mini` (NixOS), `macm1`, `mac16` (macOS via nix-darwin).

**Architecture:**
- **Primary**: Nix flakes + Home Manager + nix-darwin for reproducible system configurations
- **Secondary**: GNU Stow for traditional dotfiles not managed by Nix

## Code Architecture

### Directory Structure

- **`nix/`** - Primary system configuration
  - `hosts/` - Host-specific configs (desktop, mini, macm1, mac16)
  - `modules/` - Reusable Nix modules
  - `secrets/` - Encrypted secrets using agenix
- **`dotfiles/`** - Traditional dotfiles managed by GNU Stow
- **`cli/`** - Custom `dev` CLI tool with extensive automation
- **`assets/`** - Shared resources (ZSH configs, wallpapers)

### Nix Module System

- Modular approach with reusable components in `nix/modules/`
- Each module handles specific tools/services (git, tmux, neovim, etc.)
- Host configurations compose these modules as needed

Example module structure:
```nix
{ config, lib, pkgs, ... }:
with lib;
let cfg = config.modules.<software>; in {
  options.modules.<software> = {
    enable = mkEnableOption "<software>";
  };
  config = mkIf cfg.enable {
    homebrew.casks = [ "<software>" ]; # for macOS
    # or: environment.systemPackages = [ pkgs.<software> ]; # for NixOS
  };
}
```

### Neovim Configuration

- Shortcuts go in dotfiles/nvim/.config/nvim/lua/shortcuts.lua

### dev CLI

- Place commands in `cli/libexec`.
- Use lowercase letters and hyphens for multi-word commands
- Always document commands according to `juanibiapina/sub`
  ```bash
  #!/usr/bin/env bash
  #
  # Summary: <Brief one-line description>
  #
  # Usage: {cmd} [options] [arguments]
  #
  # <Additional description if needed>
  ```
- Use `#!/usr/bin/env bash`
- Use `set -e`
- Parsing arg: `declare -A args="($_DEV_ARGS)"`
- Accessing args: ${args[owner]} (note that args must be defined in Usage string)

## Development Workflow

### Making Configuration Changes

1. **For Nix-managed configs**: Modify files in `nix/` directory
2. **For traditional dotfiles**: Modify files in `dotfiles/` directory
3. **Test changes**: Use `nix flake check` to verify before switching
4. **Apply changes**: Use `dev nix switch` for Nix configs (make sure new files have been stated in git)
5. **Install dotfiles**: Use `make install` for dotfiles
