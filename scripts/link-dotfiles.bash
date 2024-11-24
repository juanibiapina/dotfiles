#!/usr/bin/env bash

# Directory where dotfiles are stored
prefix="dotfiles"

echo "Linking dotfiles"
for path in $prefix/*; do
  # Name of current package (first level directory inside prefix)
  name=${path##*/}

  # Loop through all config files recursively
  for file in `find "$path/"`; do
    # Remove `prefix/name` to get the final relative path of the config file or directory
    file="${file#"$prefix/$name/"}"

    # The first entry is always `prefix/name/` which gets reduced to nothing
    if [ -z "$file" ]; then
      continue
    fi

    # Process file
    source_path="$prefix/$name/$file"
    destination_path="$HOME/$file"
    if [ -d "$source_path" ]; then
      # In case it's a directory, create it, otherwise stow will link the
      # directory instead of the file, causing later added files to be tracked
      # by git
      mkdir -p "$destination_path"
    fi
  done

  # Install dotfiles with stow
  stow -t "${HOME}" -d "$prefix" "$name"
done
