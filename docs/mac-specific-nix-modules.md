# Mac-Specific Nix Modules

This document lists the Nix modules that are imported into both macOS hosts (`mac16` and `macm1`) but NOT included in any NixOS hosts (`desktop` and `mini`).

Mac-specific modules are now organized in the `nix/modules/macos/` directory for better architectural clarity, while cross-platform modules remain in `nix/modules/`.

## Mac-Specific Modules (macos/ directory)

The following modules are located in `nix/modules/macos/` and are imported by both Mac hosts but not by NixOS hosts:

- [`macos-defaults.nix`](nix/modules/macos/macos-defaults.nix) - macOS system defaults and preferences
- [`aerospace.nix`](nix/modules/macos/aerospace.nix) - AeroSpace window manager for macOS
- [`discord.nix`](nix/modules/macos/discord.nix) - Discord messaging application
- [`docker.nix`](nix/modules/macos/docker.nix) - Docker containerization platform

## Cross-Platform Modules (Mac + NixOS)

The following modules in `nix/modules/` are shared between Mac hosts and some NixOS hosts:

- [`direnv.nix`](nix/modules/direnv.nix) - direnv shell integration for automatic environment loading (Mac-only)
- [`git.nix`](nix/modules/git.nix) - Git version control configuration (Mac-only)
- [`lua.nix`](nix/modules/lua.nix) - Lua programming language and development tools (Mac-only)
- [`markdown.nix`](nix/modules/markdown.nix) - markdown processing and viewing tools (Mac-only)
- [`nodejs.nix`](nix/modules/nodejs.nix) - Node.js development environment (Mac-only)
- [`ruby.nix`](nix/modules/ruby.nix) - Ruby programming language and development tools (Mac-only)
- [`tmux.nix`](nix/modules/tmux.nix) - tmux terminal multiplexer (Mac-only)

## Shared Cross-Platform Modules

The following module is shared between Mac hosts and NixOS hosts:

- [`python.nix`](nix/modules/python.nix) - Python development environment (present in mac16, macm1, and desktop)

## Host-Specific Mac Modules

### mac16 only:
- [`doppler.nix`](nix/modules/macos/doppler.nix) - Doppler secrets management
- [`hookdeck.nix`](nix/modules/macos/hookdeck.nix) - Hookdeck webhook testing platform  
- [`postman.nix`](nix/modules/macos/postman.nix) - Postman API testing tool

### macm1 only:
- [`retroarch.nix`](nix/modules/macos/retroarch.nix) - RetroArch gaming emulator
- [`googlechrome.nix`](nix/modules/macos/googlechrome.nix) - Google Chrome web browser

## Shared Across All Hosts

These modules appear in all four host configurations:
- [`substituters.nix`](nix/modules/substituters.nix) - Nix binary cache substituters
- [`openssh.nix`](nix/modules/openssh.nix) - SSH server configuration

## Architecture Benefits

The reorganization into `nix/modules/macos/` provides several advantages:

1. **Clear Separation**: Mac-specific modules are immediately identifiable by their location
2. **Reduced Cognitive Load**: Developers can focus on relevant modules for their platform
3. **Easier Maintenance**: Platform-specific concerns are isolated and easier to manage
4. **Scalable Organization**: Structure supports future platform additions (e.g., nix/modules/nixos/)

## Analysis

The Mac-specific modules reflect the different use cases and requirements of macOS workstations compared to the NixOS servers:

1. **Development Tools**: Heavy focus on development environments (Ruby, Node.js, Lua, Git, tmux)
2. **Desktop Applications**: GUI applications like Discord, Chrome, and gaming emulators  
3. **macOS Integration**: Native macOS features (defaults, window management with AeroSpace)
4. **Developer Productivity**: Tools for API testing, webhook development, and secrets management

The clear separation between `nix/modules/macos/` and `nix/modules/` makes the architecture more maintainable and self-documenting.