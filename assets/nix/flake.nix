{
  description = "NixOS configuration";

  inputs = {
    nixpkgs = {
      url = "github:NixOS/nixpkgs/nixos-unstable";
    };

    nixpkgs_pcloud_working = {
      url = "github:NixOS/nixpkgs/e3652e0735fbec227f342712f180f4f21f0594f2";
    };

    neovim-nightly-overlay = {
      url = "github:nix-community/neovim-nightly-overlay";
    };

    nix-darwin.url = "github:LnL7/nix-darwin";
    nix-darwin.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, nixpkgs_pcloud_working, neovim-nightly-overlay, nix-darwin, ... }: {
    checks.x86_64-linux.desktop = self.nixosConfigurations."desktop".config.system.build.toplevel;
    checks.x86_64-linux.mini = self.nixosConfigurations."mini".config.system.build.toplevel;

    nixosConfigurations.desktop = nixpkgs.lib.nixosSystem rec {
      system = "x86_64-linux";

      pkgs = import nixpkgs {
        system = system;
        config.allowUnfree = true;
        config.permittedInsecurePackages = [
          "electron-25.9.0" # for obsidian
        ];
        overlays = [ neovim-nightly-overlay.overlay ];
      };

      specialArgs = {
        nixpkgs_pcloud_working = import nixpkgs_pcloud_working {
          system = system;
          config.allowUnfree = true;
        };
      };

      modules = [ ./hosts/desktop/configuration.nix ];
    };

    nixosConfigurations.mini = nixpkgs.lib.nixosSystem rec {
      system = "x86_64-linux";

      pkgs = import nixpkgs {
        system = system;
        config.allowUnfree = true;
        overlays = [ neovim-nightly-overlay.overlay ];
      };

      modules = [ ./hosts/mini/configuration.nix ];
    };

    darwinConfigurations."babbel" = nix-darwin.lib.darwinSystem {
      specialArgs = {
        inherit self;
      };

      modules = [ ./hosts/babbel/configuration.nix ];
    };
  };
}
