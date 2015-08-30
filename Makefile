all: vim zsh tmux git gg ctags lein guard pow

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

ctags:
	ln -sf "${HOME}/.dotfiles/ctags/ctags" "${HOME}/.ctags"

lein:
	mkdir -p "${HOME}/.lein"
	ln -sf "${HOME}/.dotfiles/lein/profiles.clj" "${HOME}/.lein/profiles.clj"

guard:
	ln -sf "${HOME}/.dotfiles/guard/guard.rb" "${HOME}/.guard.rb"

pow:
	ln -sf "${HOME}/.dotfiles/pow/powconfig" "${HOME}/.powconfig"

.PHONY: all vim zsh tmux git gg ctags lein guard pow
