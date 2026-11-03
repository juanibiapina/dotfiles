{ pkgs, sub, inputs, ... }:

{
  # Set time zone
  time.timeZone = "Europe/Berlin";

  # Set default locale
  i18n.defaultLocale = "en_US.UTF-8";

  # enable flakes
  nix.settings.experimental-features = [ "nix-command" "flakes" ];

  # add my user to trusted users
  nix.settings.trusted-users = [ "root" "juan" ];

  # Define a user account
  users.users.juan = {
    isNormalUser = true;
    linger = true;
    hashedPassword = "$6$Rkbgpo6Vup$lgMtnmWatUHOLmj6UeJQGr/WTQ.MhaukfBFipgMhqAyVopJtzayYFQYaMLY/HJsGQr4Gsz5QFdHta4/Xg71U2/";
    shell = pkgs.zsh;
    extraGroups = [ "wheel" "docker" "audio" "networkmanager" ];
    openssh.authorizedKeys.keys = (import ../ssh-keys.nix).userList;
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
  programs.gnupg.agent = {
    enable = true;
    pinentryPackage = pkgs.pinentry-curses;
    settings = {
      no-grab = "";
      no-allow-external-cache = "";
      default-cache-ttl = 86400;
      max-cache-ttl = 86400;
    };
  };

  # Enable direnv
  programs.direnv = {
    enable = true;
    silent = true;
    nix-direnv.enable = true;
  };

  # Shared packages for all systems
  environment.systemPackages = with pkgs;
  let
    nvimPackages = callPackage ../../packages/nvim.nix { inherit inputs; };
  in
  [
    # code editor
    nvimPackages.nvim
    nvimPackages.nvim-server
    nvimPackages.nvim-plug-install

    # basic tools (mostly for my dotfiles)
    (import ../../packages/gob.nix { inherit pkgs; })
    inputs.starmux.packages.${pkgs.stdenv.hostPlatform.system}.default
    sub.packages."${pkgs.stdenv.hostPlatform.system}".sub
    difftastic
    git
    git-crypt
    delta
    gnumake
    keepassxc
    (python3.withPackages (ps: with ps; [ requests ]))
    python3Packages.nbdime
    starship
    stow
    wget

    # tools
    gum # interactive shell toolkit
    restic # backup tool
    rclone # cloud storage synchronization tool

    # coding
    fd # file finder
    fzf # fuzzy finder
    lazygit # git client
    nixd # nix language server
    typescript-language-server
    nodejs # default node/npm for dev (mini has no mise)
    ripgrep # grep
    watchexec # file watcher
  ];
}
