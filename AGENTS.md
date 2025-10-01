# Repository Guidelines

## Project Structure & Module Organization
`dotfiles/` mirrors the `$HOME` tree per application; match the destination layout when adding files. `cli/` hosts the `dev` automation tool (commands in `cli/libexec/`, completions in `cli/completions/`, shared helpers in `cli/lib/`). System definitions live under `nix/hosts/<host>/` with shared pieces in `nix/modules/` and custom packages in `nix/packages/`. Store reusable assets in `assets/`, long-form docs in `docs/`, and helper scripts in `scripts/`. Keep encrypted material in `secrets/` via agenix.

## Build, Test, and Development Commands
`make install` relinks dotfiles and refreshes Neovim plugins. Enter a reproducible shell with `nix develop`. Validate changes locally with `nix flake check` (or `dev nix build --system <host>` for targeted builds). When you need to apply configs, use `dev nix switch`—it auto-picks `darwin-rebuild`, `system-manager`, or `nixos-rebuild` depending on the machine. Run `dev nix check` sparingly for upgrade previews; it escalates to `sudo`.

## Coding Style & Naming Conventions
Use two-space indentation for Nix, shell, and JSON-like files; wrap lines under ~100 characters. Shell entrypoints start with `#!/usr/bin/env bash`, enable `set -e` (add `-uo pipefail` when robust error handling matters), and favor clear loops over dense one-liners. Document new `dev` commands following the `juanibiapina/sub` header format and place executables in `cli/libexec/<topic>-<action>` (kebab-case). Name dotfiles after their target path, e.g. `dotfiles/git/.gitconfig`.

## Testing Guidelines
Automated coverage is light; treat manual checks as part of every change. After dotfile edits, run `make install` then verify symlinks in `$HOME`. For Neovim tweaks, execute `nvim --headless +'checkhealth' +qall`. For Nix updates, run `nix flake check --show-trace` and, when feasible on the target host, `dev nix build --system <host>` followed by `dev nix switch`. NixOS-specific work can also rely on `sudo nixos-rebuild dry-run --flake .#<host>`; macOS changes should pass `darwin-rebuild check --flake .#<host>`.

## Commit & Pull Request Guidelines
Follow the `area: concise summary` convention seen in history (`tmux: Add codex to agents window`). Group related edits; avoid mixing platforms in a single commit. Pull requests should state motivation, list validation commands (include `nix flake check` / `dev nix switch` runs), and link issues when available. Provide screenshots or terminal captures for UI-facing adjustments (Sway, tmux, Ghostty).

## Security & Secrets
Keep credentials encrypted with agenix. Place `.age` files under `secrets/`, reference them from the relevant Nix host module, and never commit plaintext tokens or machine-specific overrides. If you need to rotate keys, use the `dev secrets/*` helpers to export/import the master key securely.
