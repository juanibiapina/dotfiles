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

    ghostty = {
      url = "github:ghostty-org/ghostty";
    };

    gh-cleanup-notifications = {
      url = "github:awendt/gh-cleanup-notifications";
      flake = false;
    };

    gh-pr-await = {
      url = "github:juanibiapina/gh-pr-await";
      flake = false;
    };

    nix-ai-tools = {
      url = "github:numtide/nix-ai-tools";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    confluence-cli = {
      url = "github:pchuri/confluence-cli";
      flake = false;
    };

    browse-cli = {
      url = "github:juanibiapina/browse-cli";
      flake = false;
    };

    websearch = {
      url = "github:juanibiapina/websearch";
      flake = false;
    };

    gmail-await = {
      url = "github:juanibiapina/gmail-await";
      flake = false;
    };

    todo = {
      url = "github:juanibiapina/todo";
      flake = false;
    };

    gws = {
      url = "github:googleworkspace/cli";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    gob = {
      url = "github:juanibiapina/gob";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    mcpli = {
      url = "github:juanibiapina/mcpli";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    slavingia-skills = {
      url = "github:slavingia/skills";
      flake = false;
    };

    last30days-skill = {
      url = "github:mvanhorn/last30days-skill";
      flake = false;
    };

    superpowers-skills = {
      url = "github:obra/superpowers-skills";
      flake = false;
    };

    impeccable-skills = {
      url = "github:pbakaus/impeccable";
      flake = false;
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
          home-manager.sharedModules = [
            agenix.homeManagerModules.default
          ];
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

    darwinConfigurations."macr" = nix-darwin.lib.darwinSystem {
      specialArgs = mkSpecialArgs;

      modules = [
        ./nix/hosts/macr/configuration.nix

        agenix.nixosModules.default

        home-manager.darwinModules.home-manager {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.extraSpecialArgs = { inherit inputs; };
          home-manager.users."juan.ibiapina" = import ./nix/hosts/macr/home-manager.nix;
          home-manager.sharedModules = [
            agenix.homeManagerModules.default
          ];
        }
      ];
    };
  };
}
