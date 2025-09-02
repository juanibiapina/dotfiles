{ pkgs, inputs, ... }:

{
  imports = [
    ../../modules/openssh.nix
    ../../modules/macos/system.nix
    ../../modules/macos/macos-defaults.nix
    ../../modules/macos/development.nix

    ../../modules/macos/aerospace.nix
    ../../modules/macos/discord.nix
    ../../modules/macos/doppler.nix
    ../../modules/macos/hookdeck.nix
    ../../modules/macos/postman.nix
  ];

  networking.hostName = "juanibiapina"; # this is enforced by Contentful

  # Set username
  modules.system.username = "juan.ibiapina";

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

  homebrew = {
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
  modules.discord.enable = true;
}
