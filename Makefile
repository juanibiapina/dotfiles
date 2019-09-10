.PHONY: all
all: asdf vim zsh tmux git gg ctags guard todo rubygems lish bin kitty karabiner rbenv

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
