# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a sophisticated multi-platform dotfiles repository built around Nix as the primary configuration management system. It supports 4 hosts: `desktop`, `mini` (NixOS), `macm1`, `mac16` (macOS via nix-darwin).

**Architecture:**
- **Primary**: Nix flakes + Home Manager + nix-darwin for reproducible system configurations
- **Secondary**: GNU Stow for traditional dotfiles not managed by Nix

## Common Commands

### System Configuration (Nix)
```bash
# Build system configuration locally without switching
dev nix build <desktop|mini|macm1|juanibiapina>

# Switch to new configuration (use for applying changes)
dev nix switch

# Check what needs updating
dev nix check

# Clean up Nix store
dev nix cleanup
```

### Traditional Dotfiles
```bash
# Link dotfiles using GNU Stow
make install
```

### Development Workflow (dev CLI)
```bash
# List all projects in workspace
dev list

# Clone and start working on a project
dev start <github-url>

# Open existing project in tmux session
dev open <project>

# AI-powered commit message generation
dev ci [title]

# Create pull request (pushes branch first)
dev pr [--draft] [base-branch]

# Update all local repositories
dev update-all

# Run project scripts from scripts/ directory
dev run <script-name>
```

### Git Workflow
```bash
# Standard git operations work normally
# Use `dev ci` for AI-generated commit messages
# Use `dev pr` for automated PR creation
# Use `dev review <pr-id>` for PR review setup
```

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

## Development Workflow

### Making Configuration Changes
1. **For Nix-managed configs**: Modify files in `nix/` directory
2. **For traditional dotfiles**: Modify files in `dotfiles/` directory
3. **Test changes**: Use `dev nix build <host>` to verify before switching
4. **Apply changes**: Use `dev nix switch` for Nix configs or `make install` for dotfiles

### Installing Software
When installing new software, create automated Nix configurations instead of manual installations:

1. **Create a Nix module** in `nix/modules/<software>.nix` with an enable option
2. **For macOS systems**: Prefer Homebrew packages in the module (darwin systems use both Nix and Homebrew)
3. **Fallback to nixpkgs**: If software isn't available in Homebrew, use nixpkgs
4. **Add to current host only**: Import the module and enable it only in the current host configuration (unless specifically requested otherwise)
5. **Apply changes**: Use `dev nix switch` to install the software (make sure new files have been staged in git)

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

### Project Management
- Projects are organized in `$WORKSPACE` with org/repo structure
- Use `dev start <url>` to clone and set up new projects
- Each project gets a dedicated tmux session with predefined windows
- Project-specific scripts go in `scripts/` directory, run with `dev run <script>`

### Host-Specific Considerations
- **desktop/mini** (NixOS): Full NixOS system management
- **macm1/mac16** (macOS): Uses nix-darwin for system-level configs
- Host differences are handled in `nix/hosts/<hostname>/` directories
- Some configs may be platform-specific (Linux vs macOS)

## Secrets Management
- Uses `agenix` for encrypted secrets
- Secrets stored in `nix/secrets/` directory
- Each host has its own secrets file

## Software Stack
- **Shell**: ZSH with extensive plugin system
- **Terminal**: Ghostty
- **Editor**: Neovim (comprehensive config in `dotfiles/nvim/`)
- **Multiplexer**: tmux with custom configuration
- **WM**: Sway (Linux) / Aerospace (macOS)
- **Browser**: Firefox

## Testing Configuration Changes
- Use `dev nix build <host>` to test Nix configurations locally

## Important Notes
- Configuration is host-specific - changes may not apply to all hosts
- The `dev` CLI provides automation for most common tasks
- Secrets must be properly encrypted using agenix before committing
