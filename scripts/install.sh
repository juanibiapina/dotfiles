#!/usr/bin/env bash

# Link all dotfiles
for path in packages/*; do
  # Do not process regular files, only directories
  if [ ! -d "$path" ]; then
    continue
  fi

  package=${path##*/}

  stow -t "${HOME}" -d packages "$package"
done

# Linux specific
if [ "$(uname)" = "Linux" ]; then
  # Build arch packages
  for pkg in assets/arch/*; do
    (
      cd "$pkg"
      makepkg -ci --noconfirm
    )
  done
fi
