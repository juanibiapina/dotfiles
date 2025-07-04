.PHONY: install
install:
	@./scripts/link-dotfiles.bash
	@./scripts/update-claude-config.bash
