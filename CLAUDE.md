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

### Key Configuration Files

- `flake.nix` - Main Nix flake defining all system configurations
- `nix/hosts/<hostname>/` - Host-specific system and home-manager configs
- `cli/libexec/` - All `dev` CLI command implementations

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

## Development Workflow

### Making Configuration Changes

1. **For Nix-managed configs**: Modify files in `nix/` directory
2. **For traditional dotfiles**: Modify files in `dotfiles/` directory
3. **Test changes**: Use `nix flake check` to verify before switching
4. **Apply changes**: Use `dev nix switch` for Nix configs (make sure new files have been stated in git)
5. **Install dotfiles**: Use `make install` for dotfiles

### Installing Software

When installing new software, create automated Nix configurations instead of manual installations:

1. **Create a Nix module** in `nix/modules/<software>.nix` with an enable option
2. **For macOS systems**: Prefer Homebrew packages in the module (darwin systems use both Nix and Homebrew)
3. **Fallback to nixpkgs**: If software isn't available in Homebrew, use nixpkgs
4. **Add to current host only**: Import the module and enable it only in the current host configuration (unless specifically requested otherwise)

### Project Management

- Projects are organized in `$WORKSPACE` with org/repo structure
- Use `dev start <url>` to clone and set up new projects
- Each project gets a dedicated tmux session with predefined windows
- Project-specific scripts go in `scripts/` directory, run with `dev run <script>`

## Secrets Management

- Uses `agenix` for encrypted secrets
- Secrets stored in `nix/secrets/` directory

## Software Stack

- **Shell**: ZSH
- **Terminal**: Ghostty
- **Editor**: Neovim (config in `dotfiles/nvim/`)
- **Multiplexer**: tmux
- **WM**: Sway (Linux) / Aerospace (macOS)
- **Browser**: Firefox Developer Edition
