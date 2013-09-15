#!/usr/bin/env bash

# required software
## basher
"$HOME/bin/hub" clone juanibiapina/basher "$HOME/.basher"

# vim
ln -sf "$HOME/.dotfiles/vim" "$HOME/.vim"
ln -sf "$HOME/.vim/vimrc" "$HOME/.vimrc"
ln -sf "$HOME/.vim/gvimrc" "$HOME/.gvimrc"

# zsh
ln -sf "$HOME/.dotfiles/zsh/zshrc" "$HOME/.zshrc"
ln -sf "$HOME/.dotfiles/zsh/bin/zshconfig" "$HOME/bin/zshconfig"

# tmux
ln -sf "$HOME/.dotfiles/tmux/tmux.conf" "$HOME/.tmux.conf"
ln -sf "$HOME/.dotfiles/tmux/tmuxinator" "$HOME/.tmuxinator"

# git
ln -sf "$HOME/.dotfiles/git/gitconfig" "$HOME/.gitconfig"
ln -sf "$HOME/.dotfiles/git/gitignore" "$HOME/.gitignore"

# gg
ln -sf "$HOME/.dotfiles/gg" "$HOME/.gg"

touch "$HOME/.dotfiles/.tmp/installed"
