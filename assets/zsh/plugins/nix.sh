# allow unfree packages when running with `nix run nixpkgs#<package>`
export NIXPKGS_ALLOW_UNFREE=1

if [ "$(uname -s)" = "Darwin" ]; then
  # nix setup that is normally done by /etc/zshrc on osx
  if [ -e '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh' ]; then
    . '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh'
  fi
fi
