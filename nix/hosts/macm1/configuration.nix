{
  imports = [
    ../../modules/openssh.nix
    ../../modules/substituters.nix
    ../../modules/macos/system.nix
    ../../modules/macos/development.nix
    ../../modules/macos/gaming.nix

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

  homebrew = {
    brews = [
      "ghostscript"
      "imagemagick"
    ];
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
}
