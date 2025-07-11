# Mac-Specific Nix Modules

This document lists the Nix modules that are imported into both macOS hosts (`mac16` and `macm1`) but NOT included in any NixOS hosts (`desktop` and `mini`).

## Modules Present in Both Mac Hosts Only

The following modules are imported into both [`mac16`](nix/hosts/mac16/configuration.nix:5) and [`macm1`](nix/hosts/macm1/configuration.nix:4) configurations but are absent from both [`desktop`](nix/hosts/desktop/configuration.nix:4) and [`mini`](nix/hosts/mini/configuration.nix:8):

- [`macos-defaults.nix`](nix/modules/macos-defaults.nix) - macOS system defaults and preferences
- [`direnv.nix`](nix/modules/direnv.nix) - direnv shell integration for automatic environment loading
- [`aerospace.nix`](nix/modules/aerospace.nix) - AeroSpace window manager for macOS
- [`discord.nix`](nix/modules/discord.nix) - Discord messaging application
- [`markdown.nix`](nix/modules/markdown.nix) - markdown processing and viewing tools
- [`git.nix`](nix/modules/git.nix) - Git version control configuration
- [`tmux.nix`](nix/modules/tmux.nix) - tmux terminal multiplexer
- [`lua.nix`](nix/modules/lua.nix) - Lua programming language and development tools
- [`nodejs.nix`](nix/modules/nodejs.nix) - Node.js development environment
- [`docker.nix`](nix/modules/docker.nix) - Docker containerization platform
- [`ruby.nix`](nix/modules/ruby.nix) - Ruby programming language and development tools

## Modules Present in Mac Hosts and Desktop

The following module is imported into both Mac hosts and the desktop host:

- [`python.nix`](nix/modules/python.nix) - Python development environment (present in [`mac16`](nix/hosts/mac16/configuration.nix:21), [`macm1`](nix/hosts/macm1/configuration.nix:18), and [`desktop`](nix/hosts/desktop/configuration.nix:15))

## Modules Present in Only One Mac Host

### mac16 only:
- [`doppler.nix`](nix/modules/doppler.nix) - Doppler secrets management (imported at [nix/hosts/mac16/configuration.nix:12](nix/hosts/mac16/configuration.nix:12))
- [`hookdeck.nix`](nix/modules/hookdeck.nix) - Hookdeck webhook testing platform (imported at [nix/hosts/mac16/configuration.nix:14](nix/hosts/mac16/configuration.nix:14))
- [`postman.nix`](nix/modules/postman.nix) - Postman API testing tool (imported at [nix/hosts/mac16/configuration.nix:15](nix/hosts/mac16/configuration.nix:15))

### macm1 only:
- [`retroarch.nix`](nix/modules/retroarch.nix) - RetroArch gaming emulator (imported at [nix/hosts/macm1/configuration.nix:17](nix/hosts/macm1/configuration.nix:17))
- [`googlechrome.nix`](nix/modules/googlechrome.nix) - Google Chrome web browser (imported at [nix/hosts/macm1/configuration.nix:19](nix/hosts/macm1/configuration.nix:19))

## Shared Across All Hosts

These modules appear in all four host configurations:
- [`substituters.nix`](nix/modules/substituters.nix) - Nix binary cache substituters
- [`openssh.nix`](nix/modules/openssh.nix) - SSH server configuration

## Analysis

The Mac-specific modules reflect the different use cases and requirements of macOS workstations compared to the NixOS servers:

1. **Development Tools**: Heavy focus on development environments (Ruby, Node.js, Lua, Git, tmux)
2. **Desktop Applications**: GUI applications like Discord, Chrome, and gaming emulators  
3. **macOS Integration**: Native macOS features (defaults, window management with AeroSpace)
4. **Developer Productivity**: Tools for API testing, webhook development, and secrets management

Some development tools like Python are shared between Mac hosts and the desktop workstation, indicating common development needs across different platforms. The NixOS mini server focuses primarily on server functionality and system services rather than development environments and desktop applications.