{ config, ... }:

{
  imports = [
    ../../modules/homemanager/syncthing.nix
    ../../modules/homemanager/agents.nix
    ../../modules/homemanager/gitbutler.nix
    ../../modules/homemanager/bat.nix
    ../../modules/homemanager/pi-extensions.nix
    ../../modules/homemanager/ssh.nix
    ../../modules/homemanager/gh.nix
    ../../modules/homemanager/mise.nix
    ../../modules/homemanager/google.nix
    ../../modules/homemanager/browse-cli.nix
  ];

  home.username = "juan";

  # Home Manager release this config was first written against. Do not bump.
  home.stateVersion = "25.11";

  age.secrets.mb5p-syncthing-cert = {
    file = ../../secrets/mb5p-syncthing-cert.age;
  };

  age.secrets.mb5p-syncthing-key = {
    file = ../../secrets/mb5p-syncthing-key.age;
  };

  services.syncthing = {
    key = config.age.secrets.mb5p-syncthing-key.path;
    cert = config.age.secrets.mb5p-syncthing-cert.path;
  };

  modules.ssh.enable = true;
}
