.PHONY: all
all: asdf vim zsh tmux git ctags rubygems bin karabiner rbenv alacritty jaime shelf starship

.PHONY: asdf
asdf:
	stow -t "${HOME}" -d packages asdf

.PHONY: vim
vim:
	ln -sfn "${HOME}/.dotfiles/vim" "${HOME}/.vim"
	ln -sfn "${HOME}/.dotfiles/vim" "${HOME}/.config/nvim"
	ln -sf "${HOME}/.vim/vimrc" "${HOME}/.vimrc"

.PHONY: zsh
zsh:
	ln -sf "${HOME}/.dotfiles/zsh/zshrc" "${HOME}/.zshrc"

.PHONY: tmux
tmux:
	ln -sf "${HOME}/.dotfiles/tmux/tmux.conf" "${HOME}/.tmux.conf"

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
