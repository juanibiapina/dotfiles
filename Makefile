.PHONY: install
install:
	@./scripts/link-dotfiles.bash

# Generate README Table of Contents
.PHONY: toc
toc:
	doctoc README.md
