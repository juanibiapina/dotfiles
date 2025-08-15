# allow unfree packages when running with `nix run nixpkgs#<package>`
export NIXPKGS_ALLOW_UNFREE=1

# reset the guard so nix-daemon.sh gets applied properly
unset __ETC_PROFILE_NIX_SOURCED

if [ "$(uname -s)" = "Darwin" ]; then
  # nix setup that is normally done by /etc/zshrc on osx
  if [ -e '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh' ]; then
    . '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh'
  fi
elif [ "$(uname -s)" = "Linux" ]; then
  # nix setup for linux
  if [ -e '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh' ]; then
    . '/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh'
  fi
  
  # system-manager setup for linux
  if [ -e '/etc/profile.d/system-manager-path.sh' ]; then
    . '/etc/profile.d/system-manager-path.sh'
  fi
fi
