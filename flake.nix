{
  description = "Systems configuration";

  inputs = {
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

  outputs = inputs@{ self, nixpkgs, nix-darwin, sub, systems, home-manager, ... }: {
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
          home-manager.users.juan = import ./nix/hosts/desktop/home-manager.nix;
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
          home-manager.users.juan = import ./nix/hosts/mini/home-manager.nix;
        }
      ];
    };

    darwinConfigurations."macm1" = nix-darwin.lib.darwinSystem {
      specialArgs = {
        inherit self inputs;
      };

      modules = [
        ./nix/hosts/macm1/configuration.nix

        home-manager.darwinModules.home-manager {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.users.juan = import ./nix/hosts/macm1/home-manager.nix;
        }
      ];
    };

    darwinConfigurations."juanibiapina" = nix-darwin.lib.darwinSystem {
      specialArgs = {
        inherit self inputs;
      };

      modules = [
        ./nix/hosts/contentful/configuration.nix

        home-manager.darwinModules.home-manager {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.users."juan.ibiapina" = import ./nix/hosts/contentful/home-manager.nix;
        }
      ];
    };
  };
}
