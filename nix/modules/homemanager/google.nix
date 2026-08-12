{ config, lib, ... }:

{
  age.secrets.google-credentials = {
    file = ../../secrets/google-credentials.age;
  };

  home.activation.google-credentials = lib.hm.dag.entryAfter ["writeBoundary"] ''
    for dir in .gmcli .gdcli .gccli; do
      run mkdir -p ~/"$dir"
      run ln -sf ${config.age.secrets.google-credentials.path} ~/"$dir"/credentials.json
    done
  '';
}
