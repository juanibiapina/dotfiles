{ self, pkgs, inputs, ... }:

{
  imports = [
    ../../modules/macos/macos-defaults.nix
    ../../modules/macos/development.nix

    ../../modules/direnv.nix
    ../../modules/lua.nix
    ../../modules/markdown.nix
    ../../modules/nodejs.nix
    ../../modules/openssh.nix
    ../../modules/python.nix
    ../../modules/ruby.nix
    ../../modules/substituters.nix
    ../../modules/tmux.nix

    ../../modules/macos/aerospace.nix
    ../../modules/macos/charm.nix
    ../../modules/macos/discord.nix
    ../../modules/macos/docker.nix
    ../../modules/macos/doppler.nix
    ../../modules/macos/googlechrome.nix
    ../../modules/macos/hookdeck.nix
    ../../modules/macos/jira.nix
    ../../modules/macos/postman.nix
    ../../modules/macos/retroarch.nix
  ];

  networking.hostName = "juanibiapina"; # this is enforced by Contentful

  # Set primary user for nix-darwin
  system.primaryUser = "juan.ibiapina";

  # Configure user account
  users.users."juan.ibiapina".home = "/Users/juan.ibiapina";

  # Enable sudo without password
  security.sudo.extraConfig = ''
    juan.ibiapina ALL=(ALL) NOPASSWD: ALL
  '';

  # Allow zsh from nix to be used as the default shell
  environment.shells = [ pkgs.zsh ];

  environment.systemPackages = with pkgs;
  let
    nvimPackages = callPackage ../../packages/nvim.nix { inherit inputs; };
  in
  [
    inputs.agenix.packages."${pkgs.system}".default

    nvimPackages.nvim
    nvimPackages.nvim-server
    nvimPackages.nvim-plug-install

    inputs.sub.packages."${pkgs.system}".sub

    bat
    fd
    fzf
    hyperfine
    ripgrep
    starship
    vim
    watchexec
    zsh

    # coding
    nixd # Nix language server
    terraform-ls # Terraform language server
  ];

  # Auto upgrade nix package and the daemon service
  nix.package = pkgs.nix;

  # Enable the Nix command and flakes
  nix.settings.experimental-features = "nix-command flakes";

  # Add trusted users to the Nix daemon
  nix.settings.trusted-users = [ "root" "juan.ibiapina" ];

  # Create /etc/zshrc that loads the nix-darwin environment
  programs.zsh.enable = true;

  homebrew = {
    enable = true;

    brews = [
      "bash"
      "bash-language-server"
      "coreutils"
      "ctags"
      "go"
      "gofumpt" # go formatter
      "golangci-lint" # go linter
      "gopls" # go language server
      "gpg"
      "htop"
      "jq"
      "ncdu"
      "openssl"
      "parallel"
      "stow"
      "superfile"
      "terminal-notifier"
      "tree"
      "wakeonlan"
      "watch"
      "wget"
    ];

    casks = [
      "betterdisplay" # for managing external displays
      "cursor"
      "dropbox"
      "firefox@developer-edition"
      "font-sauce-code-pro-nerd-font"
      "font-source-code-pro"
      "ghostty"
      "hammerspoon"
      "karabiner-elements"
      "keepassxc"
      "raycast"
      "spotify"
      "the-unarchiver"
      "whatsapp"
    ];
  };

  # Enable modules
  modules.aerospace.enable = true;
  modules.charm.enable = true;
  modules.discord.enable = true;
  modules.docker.enable = true;
  modules.jira.enable = true;
  modules.lua.enable = true;
  modules.macos-defaults.enable = true;
  modules.markdown.enable = true;
  modules.nodejs.enable = true;
  modules.python.enable = true;
  modules.ruby.enable = true;

  # Set Git commit hash for darwin-version.
  system.configurationRevision = self.rev or self.dirtyRev or null;

  # Used for backwards compatibility, please read the changelog before changing.
  # $ darwin-rebuild changelog
  system.stateVersion = 6;

  # The platform the configuration will be used on.
  nixpkgs.hostPlatform = "aarch64-darwin";
}
