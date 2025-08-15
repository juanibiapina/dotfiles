{ config, lib, pkgs, ... }:

{
  config = {
    nixpkgs.hostPlatform = "aarch64-linux";

    environment.systemPackages = [
      pkgs.delta
      pkgs.git-crypt
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