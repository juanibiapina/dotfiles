#!/usr/bin/env zsh

# vim
ln -sf "$HOME/development/dotfiles/vim" "$HOME/.vim"
ln -sf "$HOME/.vim/vimrc" "$HOME/.vimrc"
ln -sf "$HOME/.vim/gvimrc" "$HOME/.gvimrc"

# zsh
ln -sf "$HOME/development/dotfiles/zsh/zshrc" "$HOME/.zshrc"
ln -sf "$HOME/development/dotfiles/zsh/bin" "$HOME/bin"

# tmux
ln -sf "$HOME/development/dotfiles/tmux/tmux.conf" "$HOME/.tmux.conf"
ln -sf "$HOME/development/dotfiles/tmux/tmuxinator" "$HOME/.tmuxinator"

# git
ln -sf "$HOME/development/dotfiles/git/gitconfig" "$HOME/.gitconfig"
ln -sf "$HOME/development/dotfiles/git/gitignore" "$HOME/.gitignore"
