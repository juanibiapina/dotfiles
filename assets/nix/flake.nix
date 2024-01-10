{
  description = "NixOS configuration";

  inputs = {
    nixpkgs = {
      url = "github:NixOS/nixpkgs/nixos-unstable";
    };

    nixpkgs_pcloud_working = {
      url = "github:NixOS/nixpkgs/e3652e0735fbec227f342712f180f4f21f0594f2";
    };
  };

  outputs = { self, nixpkgs, nixpkgs_pcloud_working, ... }@inputs: {
    checks.x86_64-linux.nixos = self.nixosConfigurations."nixos".config.system.build.toplevel;

    nixosConfigurations.nixos = nixpkgs.lib.nixosSystem rec {
      system = "x86_64-linux";

      pkgs = import nixpkgs {
        system = system;
        config.allowUnfree = true;
        config.permittedInsecurePackages = [
          "electron-25.9.0" # for obsidian
        ];
      };

      specialArgs = {
        nixpkgs_pcloud_working = import nixpkgs_pcloud_working {
          system = system;
          config.allowUnfree = true;
        };
      };

      modules = [ ./configuration.nix ];
    };
  };
}
