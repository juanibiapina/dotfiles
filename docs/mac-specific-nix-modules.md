# Mac-Specific Nix Modules

This document lists the Nix modules that are imported into both macOS hosts (`mac16` and `macm1`) but NOT included in any NixOS hosts (`desktop` and `mini`).

Mac-specific modules are now organized in the `nix/modules/macos/` directory for better architectural clarity, while cross-platform modules remain in `nix/modules/`. All macOS modules are automatically imported via a `readDir` implementation in `nix/modules/macos/default.nix`.

## Automatic Module Importing

macOS modules use an automatic import system:

- **Implementation**: `nix/modules/macos/default.nix` uses `builtins.readDir` to automatically import all `.nix` files in the `macos/` directory
- **Host Configuration**: Both `mac16` and `macm1` now simply import `../../modules/macos` instead of listing individual modules
- **Benefits**: New macOS modules are automatically available without manual import management

## Cross-Platform Modules

The following modules in `nix/modules/` are available across platforms but may be enabled selectively per host:

- [`direnv.nix`](nix/modules/direnv.nix) - direnv shell integration for automatic environment loading
- [`git.nix`](nix/modules/git.nix) - Git version control configuration
- [`lua.nix`](nix/modules/lua.nix) - Lua programming language and development tools
- [`markdown.nix`](nix/modules/markdown.nix) - markdown processing and viewing tools
- [`nodejs.nix`](nix/modules/nodejs.nix) - Node.js development environment
- [`python.nix`](nix/modules/python.nix) - Python development environment
- [`ruby.nix`](nix/modules/ruby.nix) - Ruby programming language and development tools
- [`tmux.nix`](nix/modules/tmux.nix) - tmux terminal multiplexer

## Shared Across All Hosts

These modules appear in all four host configurations:
- [`substituters.nix`](nix/modules/substituters.nix) - Nix binary cache substituters
- [`openssh.nix`](nix/modules/openssh.nix) - SSH server configuration

## Analysis

The modular architecture provides clear separation between platform-specific and cross-platform concerns:

1. **macOS-Specific Modules** (`nix/modules/macos/`): Focus on macOS-native features and desktop applications
   - **Desktop Applications**: GUI applications like Discord, Chrome, and gaming emulators  
   - **macOS Integration**: Native macOS features (defaults, window management with AeroSpace)
   - **Developer Productivity**: Tools for API testing, webhook development, and secrets management

2. **Cross-Platform Modules** (`nix/modules/`): Development tools and utilities that work across platforms
   - **Development Environments**: Programming languages and development tools
   - **System Utilities**: SSH, networking, and system management tools

The clear separation between `nix/modules/macos/` and `nix/modules/` makes the architecture more maintainable and self-documenting, while the automatic import system ensures all modules are available where needed.
