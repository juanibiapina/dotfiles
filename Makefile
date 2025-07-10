.PHONY: install
install:
	@./scripts/link-dotfiles.bash
	@./scripts/update-claude-config.bash
	@./scripts/update-vim-plugins.bash
