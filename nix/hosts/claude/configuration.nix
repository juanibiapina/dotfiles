{ config, lib, pkgs, inputs, ... }:

{
  config = {
    nixpkgs.hostPlatform = "aarch64-linux";

    environment.systemPackages = 
    let
      nvimPackages = pkgs.callPackage ../../packages/nvim.nix { inherit inputs; };
    in
    [
      nvimPackages.nvim
      nvimPackages.nvim-server
      nvimPackages.nvim-plug-install

      inputs.sub.packages."${pkgs.system}".sub

      pkgs.delta
      pkgs.git-crypt
      pkgs.jq
      pkgs.lazygit
      pkgs.ripgrep
      pkgs.starship
    ];

    # Configure passwordless sudo via sudoers.d
    environment.etc."sudoers.d/99-juan-nopasswd" = {
      text = "juan ALL=(ALL) NOPASSWD: ALL\n";
      mode = "0440";
    };
  };
}