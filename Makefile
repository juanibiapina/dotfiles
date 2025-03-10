.PHONY: install
install:
	@./scripts/link-dotfiles.bash

.PHONY: desktop-build
desktop-build:
	nix build -v --log-format raw .#nixosConfigurations.desktop.config.system.build.toplevel
