.PHONY: install
install:
	@./scripts/install.sh

.PHONY: toc
toc:
	doctoc README.md
