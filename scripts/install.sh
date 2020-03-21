#!/usr/bin/env bash

echo "Linking dotfiles"
for path in packages/*; do
  # Do not process regular files, only directories
  if [ ! -d "$path" ]; then
    continue
  fi

  package=${path##*/}

  stow -t "${HOME}" -d packages "$package"
done

if [ "$(uname)" = "Linux" ]; then
  echo "Installing custom packages"
  # Build arch packages
  for pkg in assets/arch/*; do
    (
      cd "$pkg"
      makepkg -ci --noconfirm
    )
  done
fi

echo "Installing vim plugins"
curl -fLo ~/.config/nvim/autoload/plug.vim --create-dirs \
     https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
nvim -es -i NONE -u ~/.config/nvim/init.vim +PlugInstall +PlugUpdate +qa
