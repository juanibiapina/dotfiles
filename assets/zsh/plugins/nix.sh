# allow unfree packages when running with `nix run nixpkgs#<package>`
export NIXPKGS_ALLOW_UNFREE=1

# Note: Nix PATH setup is handled by:
# - macOS: /etc/zshenv (nix-darwin) sources set-environment
# No need to source nix-daemon.sh here - it causes duplicate PATH entries.
