#!/usr/bin/env bash

for path in packages/*; do
  # Do not process regular files, only directories
  if [ ! -d "$path" ]; then
    continue
  fi

  package=${path##*/}

  stow -t "${HOME}" -d packages "$package"
done
