{ pkgs, inputs, ... }:

{
  imports = [
    ../../modules/macos/system.nix
    ../../modules/macos/macos-defaults.nix
    ../../modules/macos/development.nix
    ../../modules/macos/gaming.nix

    ../../modules/openssh.nix
    ../../modules/tmux.nix

    ../../modules/macos/aerospace.nix
    ../../modules/macos/discord.nix
    ../../modules/macos/doppler.nix
    ../../modules/macos/googlechrome.nix
    ../../modules/macos/hookdeck.nix
    ../../modules/macos/postman.nix
  ];

  networking.hostName = "macm1";

  # Set username
  modules.system.username = "juan";

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
    inputs.antr.packages."${pkgs.system}".antr

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


  homebrew = {
    casks = [
      "alacritty"
      "cursor"
      "dropbox"
      "firefox@developer-edition"
      "font-sauce-code-pro-nerd-font"
      "font-source-code-pro"
      "ghostty"
      "karabiner-elements"
      "keepassxc"
      "musescore"
      "raycast"
      "skype"
      "slack"
      "spotify"
      "the-unarchiver"
      "whatsapp"
    ];
  };

  # Enable modules
  modules.aerospace.enable = true;
  modules.discord.enable = true;
  modules.googlechrome.enable = true;
}
