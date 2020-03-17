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
	mkdir -p "${HOME}/bin"
	ln -sf ${HOME}/.dotfiles/bin/* "${HOME}/bin"

.PHONY: karabiner
karabiner:
	stow -t "${HOME}" -d packages karabiner

.PHONY: rbenv
rbenv:
	stow -t "${HOME}" -d packages rbenv

.PHONY: alacritty
alacritty:
	ln -sf "${HOME}/.dotfiles/alacritty/alacritty.yml" "${HOME}/.config/alacritty/alacritty.yml"

.PHONY: jaime
jaime:
	ln -sf "${HOME}/.dotfiles/jaime/config.yml" "${HOME}/.config/jaime/config.yml"

.PHONY: shelf
shelf:
	ln -sf "${HOME}/.dotfiles/shelf/shelf.yml" "${HOME}/.config/shelf/shelf.yml"

.PHONY: starship
starship:
	ln -sf "${HOME}/.dotfiles/starship/starship.toml" "${HOME}/.config/starship.toml"
