{
  imports = [
    ../../modules/openssh.nix
    ../../modules/substituters.nix
    ../../modules/macos/system.nix
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
}
