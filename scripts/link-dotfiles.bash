echo "Linking dotfiles"
for path in packages/*; do
  # Do not process regular files, only directories
  if [ ! -d "$path" ]; then
    continue
  fi

  package=${path##*/}

  stow -t "${HOME}" -d packages "$package"
done

echo "Creating OS Specific dotfiles"
mkdir -p ~/.config/alacritty
ln -sf ~/.config/alacritty_base/alacritty_$(uname).yml ~/.config/alacritty/alacritty.yml
