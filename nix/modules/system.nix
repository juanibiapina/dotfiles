{ pkgs, sub, ... }:

{
  # Boot loader
  boot.loader.systemd-boot.enable = true;
  boot.loader.systemd-boot.consoleMode = "max";
  boot.loader.efi.canTouchEfiVariables = true;
  # Enable netboot.xyz entry in systemd-boot
  boot.loader.systemd-boot.netbootxyz.enable = true;
  # Enable zfs during boot
  boot.supportedFilesystems = ["zfs"];

  # Set time zone
  time.timeZone = "Europe/Berlin";

  # Set default locale
  i18n.defaultLocale = "en_US.UTF-8";

  # Configure /etc/hosts
  networking.hosts = {
    "192.168.188.30" = [ "mini.home.arpa" ];
    "192.168.188.109" = [ "desktop.home.arpa" ];
  };

  # Configure ssh aliases
  programs.ssh.extraConfig = ''
    Host desktop
      User juan
      HostName desktop.home.arpa

    Host mini
      User juan
      HostName mine.home.arpa
  '';

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
    sub.packages."${pkgs.system}".sub
    bat # required for man
    git
    git-crypt
    gitAndTools.delta
    gitmux
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
