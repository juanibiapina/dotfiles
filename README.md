# Juan's Dotfiles

## About

This my personal repository for nix configurations, dotfiles, vimfiles and CLI scripts.
They are optimized for high productivity in the terminal.

## Software

- OS: MacOS, [NixOS](https://nixos.org/)
- WM: [AeroSpace](https://github.com/nikitabobko/AeroSpace)
- Shell: [zsh](https://wiki.archlinux.org/title/Zsh)
- Terminal: [Ghostty](https://ghostty.org/)
- Editor: [neovim](https://neovim.io/)
- Browser: [Firefox](https://www.mozilla.org/en-US/firefox/developer/)

## Directory Structure

- cli: Contains `dev`, a CLI tool for running scripts using [sub](https://github.com/juanibiapina/sub)
- dotfiles: Files that are symlinked to the home directory when running 'make'. The first level directory is the name of the software (for separating files for specific programs) and inside this directory files should match the target directory structure in the home directory.
- nix: Nix configuration for all hosts, including home manager.

## Hosts

- `mini`: NixOS mini machine
- `claude`: Ubuntu server on Hetzner (ARM64), managed via SSH with Nix system-manager
- `macm1`: macOS machine with M1 Pro chip
- `mac16`: macOS machine with M3 Pro chip (hostname: `juanibiapina` - enforced by Contentful)

## Neovim

The `nvim-server` command defined in `nix/packages/nvim.nix` starts a neovim instance listening to a socket in `.local/share/nvim/socket` (not in `$HOME` directory). This allows neovim to be remote controlled by any other software running in the same directory.

## Dependencies

- Git
- GNU Make
- GNU Stow

## Inspiration

Awesome lists are a great resource to find new command line tools.

- https://github.com/alebcay/awesome-shell
- https://github.com/agarrharr/awesome-cli-apps
- https://github.com/k4m4/terminals-are-sexy
