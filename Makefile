.PHONY: all
all: vim zsh tmux git gg ctags lein guard pow x todo rubygems lish

.PHONY: vim
vim:
	ln -sfn "${HOME}/.dotfiles/vim" "${HOME}/.vim"
	ln -sf "${HOME}/.vim/vimrc" "${HOME}/.vimrc"
	ln -sf "${HOME}/.vim/gvimrc" "${HOME}/.gvimrc"

.PHONY: zsh
zsh:
	ln -sf "${HOME}/.dotfiles/zsh/zshrc" "${HOME}/.zshrc"

.PHONY: lish
lish:
	ln -sf "${HOME}/.dotfiles/lish/lishrc.lish" "${HOME}/.lishrc.lish"

.PHONY: tmux
tmux:
	ln -sf "${HOME}/.dotfiles/tmux/tmux.conf" "${HOME}/.tmux.conf"
	ln -sfn "${HOME}/.dotfiles/tmux/tmuxifier" "${HOME}/.tmuxifier"

.PHONY: git
git:
	ln -sf "${HOME}/.dotfiles/git/gitconfig" "${HOME}/.gitconfig"
	ln -sf "${HOME}/.dotfiles/git/gitignore" "${HOME}/.gitignore"

.PHONY: gg
gg:
	ln -sfn "${HOME}/.dotfiles/gg" "${HOME}/.gg"

.PHONY: ctags
ctags:
	ln -sf "${HOME}/.dotfiles/ctags/ctags" "${HOME}/.ctags"

.PHONY: lein
lein:
	mkdir -p "${HOME}/.lein"
	ln -sf "${HOME}/.dotfiles/lein/profiles.clj" "${HOME}/.lein/profiles.clj"

.PHONY: guard
guard:
	ln -sf "${HOME}/.dotfiles/guard/guard.rb" "${HOME}/.guard.rb"

.PHONY: pow
pow:
	ln -sf "${HOME}/.dotfiles/pow/powconfig" "${HOME}/.powconfig"

.PHONY: x
x:
	ln -sf "${HOME}/.dotfiles/X/Xresources" "${HOME}/.Xresources"

.PHONY: todo
todo:
	ln -sf "${HOME}/.dotfiles/todo.txt/todo.cfg" "${HOME}/.todo.cfg"

.PHONY: rubygems
rubygems:
	ln -sf "${HOME}/.dotfiles/rubygems/gemrc" "${HOME}/.gemrc"
