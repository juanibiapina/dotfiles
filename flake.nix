{
  description = "Systems configuration";

  inputs = {
    devenv = {
      url = "github:cachix/devenv";
    };

    systems = {
      url = "github:nix-systems/default";
    };

    nixpkgs = {
      url = "github:NixOS/nixpkgs/nixos-unstable";
    };

    neovim-nightly = {
      url = "github:nix-community/neovim-nightly-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    nix-darwin = {
      url = "github:LnL7/nix-darwin";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    sub = {
      url = "github:juanibiapina/sub";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    antr = {
      url = "github:juanibiapina/antr";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    ghostty = {
      url = "github:ghostty-org/ghostty";
    };
  };

  outputs = inputs@{ self, nixpkgs, nix-darwin, sub, systems, devenv, home-manager, ... }: {
    nixosConfigurations."desktop" = nixpkgs.lib.nixosSystem rec {
      system = "x86_64-linux";

      pkgs = import nixpkgs {
        system = system;
        config.allowUnfree = true;
      };

      specialArgs = {
        inherit inputs sub;
      };

      modules = [
        ./nix/hosts/desktop/configuration.nix

        home-manager.nixosModules.home-manager {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.users.juan = import ./nix/hosts/desktop/juan.nix;
        }
      ];
    };

    nixosConfigurations."mini" = nixpkgs.lib.nixosSystem rec {
      system = "x86_64-linux";

      pkgs = import nixpkgs {
        system = system;
        config.allowUnfree = true;
      };

      specialArgs = {
        inherit inputs sub;
      };

      modules = [
        ./nix/hosts/mini/configuration.nix

        home-manager.nixosModules.home-manager {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.users.juan = import ./nix/hosts/mini/juan.nix;
        }
      ];
    };

    darwinConfigurations."babbel" = nix-darwin.lib.darwinSystem {
      specialArgs = {
        inherit self inputs;
      };

      modules = [
        ./nix/hosts/babbel/configuration.nix

        home-manager.darwinModules.home-manager {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.users.jibiapina = import ./nix/hosts/babbel/jibiapina.nix;
        }
      ];
    };

    devShells = nixpkgs.lib.genAttrs (import systems) (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        default = devenv.lib.mkShell {
          inherit inputs pkgs;

          modules = [
            {
              packages = with pkgs; [
                vim-full
              ];

              languages.ruby.enable = true;
              languages.lua.enable = true;
            }
          ];
        };
      }
    );
  };
}
