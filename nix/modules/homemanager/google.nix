{ config, lib, ... }:

{
  age.secrets.google-credentials = {
    file = ../../secrets/google-credentials.age;
  };

  home.activation.gws-credentials = lib.hm.dag.entryAfter ["writeBoundary"] ''
    run mkdir -p ~/.config/gws
    run cp ${config.age.secrets.google-credentials.path} ~/.config/gws/client_secret.json

    if [ ! -s ~/.config/gws/client_secret.json ]; then
      echo "ERROR: gws client_secret.json is empty after copy" >&2
      exit 1
    fi
  '';
}
