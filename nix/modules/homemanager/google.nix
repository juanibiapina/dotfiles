{ config, lib, ... }:

{
  age.secrets.google-credentials = {
    file = ../../secrets/google-credentials.age;
  };

  age.secrets.gog-keyring-password = {
    file = ../../secrets/gog-keyring-password.age;
  };

  home.activation.google-credentials = lib.hm.dag.entryAfter ["writeBoundary"] ''
    run mkdir -p ~/.local/share/gogcli
    run ln -sf ${config.age.secrets.google-credentials.path} ~/.local/share/gogcli/client_secret.json
    run ln -sf ${config.age.secrets.gog-keyring-password.path} ~/.local/share/gogcli/keyring-password
  '';
}
