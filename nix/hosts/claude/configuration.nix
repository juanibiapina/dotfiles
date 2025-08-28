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

      pkgs.bash-language-server
      pkgs.delta
      pkgs.fd
      pkgs.fzf
      pkgs.gh
      pkgs.git-crypt
      pkgs.gum
      pkgs.jq
      pkgs.lazygit
      pkgs.markdown-oxide
      pkgs.nixd
      pkgs.nodePackages.typescript-language-server
      pkgs.nodejs
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
