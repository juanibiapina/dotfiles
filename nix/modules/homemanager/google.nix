{ config, lib, ... }:

{
  age.secrets.google-credentials = {
    file = ../../secrets/google-credentials.age;
  };

  home.activation.google-credentials = lib.hm.dag.entryAfter ["writeBoundary"] ''
    run mkdir -p ~/.gmcli
    run ln -sf ${config.age.secrets.google-credentials.path} ~/.gmcli/credentials.json
  '';
}
