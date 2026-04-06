{ config, lib, ... }:

{
  age.secrets.google-credentials = {
    file = ../../secrets/google-credentials.age;
  };

  home.activation.gws-credentials = lib.hm.dag.entryAfter ["writeBoundary"] ''
    run mkdir -p ~/.config/gws
    run ln -sf ${config.age.secrets.google-credentials.path} ~/.config/gws/client_secret.json
  '';
}
