.PHONY: install
install:
	@./scripts/link-dotfiles.bash
	@./scripts/update-vim-plugins.bash

# Generate README Table of Contents
.PHONY: toc
toc:
	doctoc README.md
