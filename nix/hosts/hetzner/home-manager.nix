{
  imports = [
    ../../modules/homemanager/agents.nix
    ../../modules/homemanager/bat.nix
    ../../modules/homemanager/gh.nix
    ../../modules/homemanager/pi-extensions.nix
    ../../modules/homemanager/browse-cli.nix
  ];

  home.username = "juan";

  # Home Manager release this config was first written against. Do not bump.
  home.stateVersion = "26.11";
}
