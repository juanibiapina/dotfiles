{ config, lib, ... }:

{
  age.secrets.xurl-config = {
    file = ../../secrets/xurl-config.age;
  };

  home.activation.xurl-config = lib.hm.dag.entryAfter ["writeBoundary"] ''
    run cp ${config.age.secrets.xurl-config.path} ~/.xurl

    if [ ! -s ~/.xurl ]; then
      echo "ERROR: ~/.xurl is empty after copy" >&2
      exit 1
    fi
  '';
}
