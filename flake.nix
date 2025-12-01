{
  description = "Systems configuration";

  inputs = {
    agenix = {
      url = "github:ryantm/agenix";
      inputs.nixpkgs.follows = "nixpkgs";
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

    gh-cleanup-notifications = {
      url = "github:awendt/gh-cleanup-notifications";
      flake = false;
    };

    nix-ai-tools = {
      url = "github:numtide/nix-ai-tools";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs@{ self, nixpkgs, nix-darwin, agenix, sub, home-manager, ... }:
  let
    mkSpecialArgs = {
      inherit inputs sub self;
    };
  in {
    nixosConfigurations."mini" = nixpkgs.lib.nixosSystem {
      specialArgs = mkSpecialArgs;

      modules = [
        ./nix/hosts/mini/configuration.nix

        agenix.nixosModules.default

        home-manager.nixosModules.home-manager {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.extraSpecialArgs = { inherit inputs; };
          home-manager.users.juan = import ./nix/hosts/mini/home-manager.nix;
        }
      ];
    };

    darwinConfigurations."macm1" = nix-darwin.lib.darwinSystem {
      specialArgs = mkSpecialArgs;

      modules = [
        ./nix/hosts/macm1/configuration.nix

        agenix.nixosModules.default

        home-manager.darwinModules.home-manager {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.extraSpecialArgs = { inherit inputs; };
          home-manager.users.juan = import ./nix/hosts/macm1/home-manager.nix;
          home-manager.sharedModules = [
            agenix.homeManagerModules.default
          ];
        }
      ];
    };

    darwinConfigurations."juanibiapina" = nix-darwin.lib.darwinSystem {
      specialArgs = mkSpecialArgs;

      modules = [
        ./nix/hosts/mac16/configuration.nix

        agenix.nixosModules.default

        home-manager.darwinModules.home-manager {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.extraSpecialArgs = { inherit inputs; };
          home-manager.users."juan.ibiapina" = import ./nix/hosts/mac16/home-manager.nix;
          home-manager.sharedModules = [
            agenix.homeManagerModules.default
          ];
        }
      ];
    };
  };
}
