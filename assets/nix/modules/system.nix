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
    "192.168.188.30" = [ "mini.local" ];
    "192.168.188.109" = [ "desktop.local" ];
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

  # Enable direnv
  programs.direnv = {
    enable = true;
    silent = true;
    nix-direnv.enable = true;
  };

  # Shared packages for all systems
  environment.systemPackages = with pkgs; [
    # nix
    cachix

    # basic tools (mostly for my dotfiles)
    (callPackage ../packages/nvim.nix {})
    (callPackage ../packages/sub.nix {})
    bat # required for man
    git
    git-crypt
    gitAndTools.delta
    gnumake
    starship
    stow
    tmux
    wget

    # coding
    fd # file finder
    fzf # fuzzy finder
    lazygit # git client
    nil # Nix language server
    nodePackages.typescript-language-server
    nodejs # for Github Copilot vim plugin
    ripgrep # grep
    terraform-ls # Terraform language server
    watchexec # file watcher
  ];
}
