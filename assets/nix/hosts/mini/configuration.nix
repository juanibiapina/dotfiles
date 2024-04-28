# Edit this configuration file to define what should be installed on
# your system. Help is available in the configuration.nix(5) man page, on
# https://search.nixos.org/options and in the NixOS manual (`nixos-help`).

{ pkgs, ... }:

{
  imports =
    [
      ./hardware-configuration.nix
      ../../cachix.nix
    ];

  # Boot loader
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;
  boot.supportedFilesystems = ["zfs"];

  networking.hostId = "1855342b";
  networking.hostName = "mini";
  networking.hosts = {
    "192.168.0.4" = [ "mini.local" "nameserver.local" ];
  };

  # Set time zone.
  time.timeZone = "Europe/Berlin";

  # Set default locale
  i18n.defaultLocale = "en_US.UTF-8";

  # console = {
  #   font = "Lat2-Terminus16";
  #   keyMap = "us";
  #   useXkbConfig = true; # use xkb.options in tty.
  # };

  # enable flakes
  nix.settings.experimental-features = [ "nix-command" "flakes" ];

  # add my user to trusted users
  nix.settings.trusted-users = [ "root" "juan" ];

  # Define a user account
  users.users.juan = {
    isNormalUser = true;
    hashedPassword = "$6$Rkbgpo6Vup$lgMtnmWatUHOLmj6UeJQGr/WTQ.MhaukfBFipgMhqAyVopJtzayYFQYaMLY/HJsGQr4Gsz5QFdHta4/Xg71U2/";
    extraGroups = [ "wheel" "docker" "networkmanager" ];
    shell = pkgs.zsh;
  };

  # Do not require a password for sudo
  security.sudo.wheelNeedsPassword = false;

  environment.systemPackages = with pkgs; [
    (callPackage ../../packages/nvim.nix {})
    (callPackage ../../packages/sub.nix {})
    cachix
    vim
    wget
    git
    git-crypt
    stow
    gnumake
    starship
  ];

  # Enable zsh as an interactive shell
  programs.zsh = {
    enable = true;
    setOptions = [];
    enableGlobalCompInit = false;
    enableBashCompletion = false;
  };

  # Enable gnupg agent
  programs.gnupg.agent.enable = true;

  # Enable the OpenSSH daemon.
  services.openssh.enable = true;

  # Open ports in the firewall.
  networking.firewall.allowedTCPPorts = [ 80 443 53 ];
  networking.firewall.allowedUDPPorts = [ 53 ];

  # Enable AdGuard Home
  services.adguardhome = {
    enable = true;
    openFirewall = true;
    mutableSettings = false;
    # https://github.com/AdguardTeam/AdGuardHome/wiki/Configuration#configuration-file
    settings = {
      dns = {
        bind_hosts = ["0.0.0.0"];
        bootstrap_dns = ["192.168.0.1"];
        upstream_dns = ["192.168.0.1"];
        port = 53;
        hostsfile_enabled = true;
      };
    };
  };

  # This option defines the first version of NixOS you have installed on this particular machine,
  # and is used to maintain compatibility with application data (e.g. databases) created on older NixOS versions.
  #
  # Most users should NEVER change this value after the initial install, for any reason,
  # even if you've upgraded your system to a new NixOS release.
  #
  # This value does NOT affect the Nixpkgs version your packages and OS are pulled from,
  # so changing it will NOT upgrade your system.
  #
  # This value being lower than the current NixOS release does NOT mean your system is
  # out of date, out of support, or vulnerable.
  #
  # Do NOT change this value unless you have manually inspected all the changes it would make to your configuration,
  # and migrated your data accordingly.
  #
  # For more information, see `man configuration.nix` or https://nixos.org/manual/nixos/stable/options#opt-system.stateVersion .
  system.stateVersion = "23.11"; # Did you read the comment?
}
