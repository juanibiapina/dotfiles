.PHONY: all
all: asdf zsh tmux git ctags rubygems bin karabiner rbenv alacritty jaime shelf starship nvim vim

.PHONY: asdf
asdf:
	stow -t "${HOME}" -d packages asdf

.PHONY: vim
vim:
	stow -t "${HOME}" -d packages vim

.PHONY: nvim
nvim:
	stow -t "${HOME}" -d packages nvim

.PHONY: zsh
zsh:
	stow -t "${HOME}" -d packages zsh

.PHONY: tmux
tmux:
	stow -t "${HOME}" -d packages tmux

.PHONY: git
git:
	stow -t "${HOME}" -d packages git

.PHONY: ctags
ctags:
	stow -t "${HOME}" -d packages ctags

.PHONY: rubygems
rubygems:
	stow -t "${HOME}" -d packages rubygems

.PHONY: bin
bin:
	stow -t "${HOME}" -d packages bin

.PHONY: karabiner
karabiner:
	stow -t "${HOME}" -d packages karabiner

.PHONY: rbenv
rbenv:
	stow -t "${HOME}" -d packages rbenv

.PHONY: alacritty
alacritty:
	stow -t "${HOME}" -d packages alacritty

.PHONY: jaime
jaime:
	stow -t "${HOME}" -d packages jaime

.PHONY: shelf
shelf:
	stow -t "${HOME}" -d packages shelf

.PHONY: starship
starship:
	stow -t "${HOME}" -d packages starship
