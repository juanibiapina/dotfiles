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

    gh-notify-await = {
      url = "github:juanibiapina/gh-notify-await";
      flake = false;
    };

    gh-pr-await = {
      url = "github:juanibiapina/gh-pr-await";
      flake = false;
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
      url = "github:juanibiapina/websearch/v2.3.0";
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

    tmux-src = {
      url = "github:tmux/tmux";
      flake = false;
    };

    deltoids = {
      url = "github:juanibiapina/deltoids";
      flake = false;
    };

    pi-gob = {
      url = "github:juanibiapina/pi-gob";
      flake = false;
    };

    pi-extension-settings = {
      url = "github:juanibiapina/pi-extension-settings";
      flake = false;
    };

    pi-tokyonight = {
      url = "github:juanibiapina/pi-tokyonight";
      flake = false;
    };

    pi-powerbar = {
      url = "github:juanibiapina/pi-powerbar";
      flake = false;
    };

    pi-usage = {
      url = "github:juanibiapina/pi-usage";
      flake = false;
    };

    gws = {
      url = "github:googleworkspace/cli";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    gmcli = {
      url = "github:badlogic/gmcli";
      flake = false;
    };

    gccli = {
      url = "github:badlogic/gccli";
      flake = false;
    };

    gdcli = {
      url = "github:badlogic/gdcli";
      flake = false;
    };

    mcpli = {
      url = "github:juanibiapina/mcpli";
      inputs.nixpkgs.follows = "nixpkgs";
    };



    impeccable-skills = {
      url = "github:pbakaus/impeccable";
      flake = false;
    };

    shadcn-ui-skills = {
      url = "github:shadcn-ui/ui";
      flake = false;
    };


    cloudflare-skill = {
      url = "github:dmmulroy/cloudflare-skill";
      flake = false;
    };


    slidev-skills = {
      url = "github:slidevjs/slidev";
      flake = false;
    };

    simple-english-skill = {
      url = "github:AminBlg/SimpleEnglish";
      flake = false;
    };

    caveman-skill = {
      url = "github:JuliusBrussee/caveman";
      flake = false;
    };

    expo-skills = {
      url = "github:expo/skills";
      flake = false;
    };

    pi = {
      url = "github:earendil-works/pi";
      flake = false;
    };

  };

  outputs = inputs@{ self, nixpkgs, nix-darwin, agenix, sub, home-manager, ... }:
  let
    mkSpecialArgs = {
      inherit inputs sub self;
    };
  in {
    # Local Android build toolchain for the Expo app in juanibiapina/zero.
    # `nix develop <dotfiles>#android` — no system change, exact Expo-57 versions.
    devShells."x86_64-linux".android =
      let
        pkgs = import nixpkgs {
          system = "x86_64-linux";
          config = {
            allowUnfree = true;
            android_sdk.accept_license = true;
          };
        };
      in
      import ./nix/shells/android.nix { inherit pkgs; };

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

    checks = nixpkgs.lib.genAttrs [ "aarch64-darwin" "aarch64-linux" "x86_64-linux" ] (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        artifacts = pkgs.runCommand "artifacts" {
          nativeBuildInputs = [ pkgs.bash pkgs.coreutils pkgs.findutils pkgs.git pkgs.gnugrep pkgs.jq sub.packages.${system}.default ];
        } ''
          export PATH=${pkgs.lib.makeBinPath [ pkgs.bash pkgs.coreutils pkgs.findutils pkgs.git pkgs.gnugrep pkgs.jq sub.packages.${system}.default ]}:$PATH
          export HOME=$TMPDIR/home
          mkdir -p "$HOME" "$TMPDIR/bin"
          cp -r ${self} "$TMPDIR/src"
          chmod -R u+w "$TMPDIR/src"
          patchShebangs "$TMPDIR/src/dotfiles/bin/bin" "$TMPDIR/src/cli" >/dev/null
          ln -s "$TMPDIR/src/dotfiles/bin/bin/dev" "$TMPDIR/bin/dev"
          export PATH="$TMPDIR/bin:$PATH"
          DEV="$TMPDIR/src/dotfiles/bin/bin/dev" bash "$TMPDIR/src/cli/test/artifacts"
          touch $out
        '';
      });

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
