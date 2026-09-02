.PHONY: install
install:
	@./scripts/link-dotfiles.bash
	@./scripts/update-vim-plugins.bash
	@dev nix switch
	@# Clear cached shell-init/completion scripts (see assets/zsh/lib/cache.zsh)
	@# so config or tool changes applied by this run are regenerated next shell.
	@rm -rf "$${XDG_CACHE_HOME:-$$HOME/.cache}/zsh"
