{ pkgs, sub, inputs, ... }:

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

  # Add certificates
  security.pki.certificates = [
  ''
    -----BEGIN CERTIFICATE-----
    MIIBpDCCAUqgAwIBAgIRANWqZHwqnqAxWF+MS7iCU48wCgYIKoZIzj0EAwIwMDEu
    MCwGA1UEAxMlQ2FkZHkgTG9jYWwgQXV0aG9yaXR5IC0gMjAyNCBFQ0MgUm9vdDAe
    Fw0yNDA1MjQyMzQwNTlaFw0zNDA0MDIyMzQwNTlaMDAxLjAsBgNVBAMTJUNhZGR5
    IExvY2FsIEF1dGhvcml0eSAtIDIwMjQgRUNDIFJvb3QwWTATBgcqhkjOPQIBBggq
    hkjOPQMBBwNCAATpsEPGh82ZcviySAycgHB0RuDVbNbCPs9qyHD604k3PaF9xr5J
    B5PCkCnjtnxz1XRWHVcDLCPWess6du/JQt5oo0UwQzAOBgNVHQ8BAf8EBAMCAQYw
    EgYDVR0TAQH/BAgwBgEB/wIBATAdBgNVHQ4EFgQU7fzebtTYvDw/fPurXrWvHOUc
    FdgwCgYIKoZIzj0EAwIDSAAwRQIgE+p0qhdBbdO/81aH6McjHK8kh7JNIyaB8EB4
    ue8EieECIQC4JGOodCDQLunq6A0lxIRNxtZ1KrnG+qmp3kOmozSS+Q==
    -----END CERTIFICATE-----
  ''
  ];

  # Configure ssh aliases
  programs.ssh.extraConfig = ''
    Host mini
      User juan
      HostName mini.home.arpa
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

  # Enable direnv
  programs.direnv = {
    enable = true;
    silent = true;
    nix-direnv.enable = true;
  };

  # Shared packages for all systems
  environment.systemPackages = with pkgs;
  let
    nvimPackages = callPackage ../../../packages/nvim.nix { inherit inputs; };
  in
  [
    # code editor
    nvimPackages.nvim
    nvimPackages.nvim-server
    nvimPackages.nvim-plug-install

    # basic tools (mostly for my dotfiles)
    inputs.antr.packages."${pkgs.stdenv.hostPlatform.system}".antr
    inputs.gob.packages."${pkgs.stdenv.hostPlatform.system}".default
    sub.packages."${pkgs.stdenv.hostPlatform.system}".sub
    bat # required for man
    difftastic
    git
    git-crypt
    delta
    gitmux
    gnumake
    python3Packages.nbdime
    starship
    stow
    tmux
    wget

    # tools
    doppler # secrets management
    gum # interactive shell toolkit
    restic # backup tool
    rclone # cloud storage synchronization tool

    # coding
    fd # file finder
    fzf # fuzzy finder
    lazygit # git client
    nixd # nix language server
    nodePackages.typescript-language-server
    nodejs # for Github Copilot vim plugin
    ripgrep # grep
    watchexec # file watcher
  ];
}
