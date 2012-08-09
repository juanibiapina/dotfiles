#!/usr/bin/env zsh

# vim
ln -sf "$HOME/development/dotfiles/vim/vimrc" "$HOME/.vimrc"
ln -sf "$HOME/development/dotfiles/vim/gvimrc" "$HOME/.gvimrc"

# zsh
ln -sf "$HOME/development/dotfiles/zsh/zshrc" "$HOME/.zshrc"
sudo chsh -s `which zsh` "$USER"
