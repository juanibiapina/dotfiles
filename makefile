all: vim zsh tmux git gg

vim:
	ln -sfn "${HOME}/.dotfiles/vim" "${HOME}/.vim"
	ln -sf "${HOME}/.vim/vimrc" "${HOME}/.vimrc"
	ln -sf "${HOME}/.vim/gvimrc" "${HOME}/.gvimrc"

zsh:
	ln -sf "${HOME}/.dotfiles/zsh/zshrc" "${HOME}/.zshrc"

tmux:
	ln -sf "${HOME}/.dotfiles/tmux/tmux.conf" "${HOME}/.tmux.conf"
	ln -sfn "${HOME}/.dotfiles/tmux/tmuxstart" "${HOME}/.tmuxstart"

git:
	ln -sf "${HOME}/.dotfiles/git/gitconfig" "${HOME}/.gitconfig"
	ln -sf "${HOME}/.dotfiles/git/gitignore" "${HOME}/.gitignore"

gg:
	ln -sfn "${HOME}/.dotfiles/gg" "${HOME}/.gg"

.PHONY: all vim zsh tmux git gg
