.PHONY: all
all: asdf vim zsh tmux git ctags guard todo rubygems bin kitty karabiner rbenv alacritty jaime shelf starship

.PHONY: asdf
asdf:
	ln -sf "${HOME}/.dotfiles/asdf/asdfrc" "${HOME}/.asdfrc"

.PHONY: vim
vim:
	ln -sfn "${HOME}/.dotfiles/vim" "${HOME}/.vim"
	ln -sfn "${HOME}/.dotfiles/vim" "${HOME}/.config/nvim"
	ln -sf "${HOME}/.vim/vimrc" "${HOME}/.vimrc"
	ln -sf "${HOME}/.vim/gvimrc" "${HOME}/.gvimrc"

.PHONY: zsh
zsh:
	ln -sf "${HOME}/.dotfiles/zsh/zshrc" "${HOME}/.zshrc"

.PHONY: tmux
tmux:
	ln -sf "${HOME}/.dotfiles/tmux/tmux.conf" "${HOME}/.tmux.conf"

.PHONY: git
git:
	ln -sf "${HOME}/.dotfiles/git/gitconfig" "${HOME}/.gitconfig"
	ln -sf "${HOME}/.dotfiles/git/gitignore" "${HOME}/.gitignore"

.PHONY: ctags
ctags:
	ln -sf "${HOME}/.dotfiles/ctags/ctags" "${HOME}/.ctags"

.PHONY: guard
guard:
	ln -sf "${HOME}/.dotfiles/guard/guard.rb" "${HOME}/.guard.rb"

.PHONY: todo
todo:
	ln -sf "${HOME}/.dotfiles/todo.txt/todo.cfg" "${HOME}/.todo.cfg"

.PHONY: rubygems
rubygems:
	ln -sf "${HOME}/.dotfiles/rubygems/gemrc" "${HOME}/.gemrc"

.PHONY: bin
bin:
	mkdir -p "${HOME}/bin"
	ln -sf ${HOME}/.dotfiles/bin/* "${HOME}/bin"

.PHONY: kitty
kitty:
	ln -sf "${HOME}/.dotfiles/kitty/kitty.conf" "${HOME}/.config/kitty/kitty.conf"

.PHONY: karabiner
karabiner:
	ln -sf "${HOME}/.dotfiles/karabiner/karabiner.json" "${HOME}/.config/karabiner/karabiner.json"

.PHONY: rbenv
rbenv:
	ln -sf "${HOME}/.dotfiles/rbenv/default-gems" "${HOME}/.rbenv/default-gems"

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
