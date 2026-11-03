{ config, ... }:

{
  imports = [
    ./hardware-configuration.nix
    ./disk-config.nix
    ../../modules/base.nix
    ../../modules/nixos/system.nix
    ../../modules/nixos/headless-wayland.nix
    ../../modules/nixos/herdr-core.nix
    ../../modules/browse-cli.nix
    ../../modules/pi.nix
    ../../modules/tmux.nix
  ];

  nixpkgs.config.allowUnfree = true;

  networking.hostName = "hetzner";

  boot.loader.grub = {
    efiSupport = true;
    efiInstallAsRemovable = true;
  };

  services.qemuGuest.enable = true;

  services.openssh.settings = {
    PasswordAuthentication = false;
    KbdInteractiveAuthentication = false;
  };

  users.users.root.openssh.authorizedKeys.keys = (import ../../modules/ssh-keys.nix).userList;
  users.users.juan.openssh.authorizedKeys.keys = (import ../../modules/ssh-keys.nix).phoneList;

  services.tailscale = {
    enable = true;
    openFirewall = true;
  };

  networking.firewall.trustedInterfaces = [ "tailscale0" ];

  modules.headless-wayland = {
    enable = true;
    vncOpenFirewall = false;
    browserExtensions = config.home-manager.users.juan.programs.browse-cli.extensionDir;
  };

  system.stateVersion = "26.11";
}
