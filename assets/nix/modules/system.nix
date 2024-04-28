{ pkgs, ... }:

{
  # Boot loader
  boot.loader.systemd-boot.enable = true;
  boot.loader.systemd-boot.consoleMode = "max";
  boot.loader.efi.canTouchEfiVariables = true;
  boot.supportedFilesystems = ["zfs"];

  # Set time zone
  time.timeZone = "Europe/Berlin";

  # Set default locale
  i18n.defaultLocale = "en_US.UTF-8";

  # Configure /etc/hosts
  networking.hosts = {
    "192.168.0.4" = [ "mini.local" "nameserver.local" ];
  };

  # enable flakes
  nix.settings.experimental-features = [ "nix-command" "flakes" ];

  # add my user to trusted users
  nix.settings.trusted-users = [ "root" "juan" ];

  # Define a user account
  users.users.juan = {
    isNormalUser = true;
    hashedPassword = "$6$Rkbgpo6Vup$lgMtnmWatUHOLmj6UeJQGr/WTQ.MhaukfBFipgMhqAyVopJtzayYFQYaMLY/HJsGQr4Gsz5QFdHta4/Xg71U2/";
    shell = pkgs.zsh;
    extraGroups = [ "wheel" "docker" "audio" "networkmanager" ];
  };

  # Enable zsh as an interactive shell
  programs.zsh = {
    enable = true;
    setOptions = [];
    enableGlobalCompInit = false;
    enableBashCompletion = false;
  };

  # Do not require a password for sudo
  security.sudo.wheelNeedsPassword = false;

  # Enable gnupg agent
  programs.gnupg.agent.enable = true;

  # Enable the OpenSSH daemon.
  services.openssh.enable = true;

  # Shared packages for all systems
  environment.systemPackages = with pkgs; [
    # nix
    cachix

    # basic tools
    (callPackage ../packages/nvim.nix {})
    (callPackage ../packages/sub.nix {})
    git
    git-crypt
    gnumake
    starship
    stow
    vim
    wget
  ];
}
