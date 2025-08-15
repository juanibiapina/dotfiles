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

    system-manager = {
      url = "github:numtide/system-manager";
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

  outputs = inputs@{ self, nixpkgs, nix-darwin, agenix, sub, home-manager, system-manager, ... }:
  let
    lib = nixpkgs.lib;

    mkSpecialArgs = system: {
      inherit inputs sub self system;
      isDarwin = lib.hasSuffix "darwin" system;
      isLinux = lib.hasSuffix "linux" system;
    };
  in {
    nixosConfigurations."desktop" = nixpkgs.lib.nixosSystem rec {
      system = "x86_64-linux";

      pkgs = import nixpkgs {
        system = system;
        config.allowUnfree = true;
      };

      specialArgs = mkSpecialArgs system;

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

      specialArgs = mkSpecialArgs system;

      modules = [
        ./nix/hosts/mini/configuration.nix

        agenix.nixosModules.default

        home-manager.nixosModules.home-manager {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.users.juan = import ./nix/hosts/mini/home-manager.nix;
        }
      ];
    };

    darwinConfigurations."macm1" = nix-darwin.lib.darwinSystem rec {
      system = "aarch64-darwin";
      specialArgs = mkSpecialArgs system;

      modules = [
        ./nix/hosts/macm1/configuration.nix

        agenix.nixosModules.default

        home-manager.darwinModules.home-manager {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.users.juan = import ./nix/hosts/macm1/home-manager.nix;
          home-manager.sharedModules = [
            agenix.homeManagerModules.default
          ];
        }
      ];
    };

    darwinConfigurations."juanibiapina" = nix-darwin.lib.darwinSystem rec {
      system = "aarch64-darwin";
      specialArgs = mkSpecialArgs system;

      modules = [
        ./nix/hosts/mac16/configuration.nix

        agenix.nixosModules.default

        home-manager.darwinModules.home-manager {
          home-manager.useGlobalPkgs = true;
          home-manager.useUserPackages = true;
          home-manager.users."juan.ibiapina" = import ./nix/hosts/mac16/home-manager.nix;
          home-manager.sharedModules = [
            agenix.homeManagerModules.default
          ];
        }
      ];
    };

    systemConfigs.claude = system-manager.lib.makeSystemConfig {
      modules = [ ./nix/hosts/claude/configuration.nix ];
    };
  };
}
