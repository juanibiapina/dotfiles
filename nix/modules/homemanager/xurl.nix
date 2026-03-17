{ config, lib, ... }:

{
  age.secrets.xurl-config = {
    file = ../../secrets/xurl-config.age;
  };

  home.activation.xurl-config = lib.hm.dag.entryAfter ["writeBoundary"] ''
    if [ ! -f ~/.xurl ]; then
      run cp ${config.age.secrets.xurl-config.path} ~/.xurl
      run chmod u+w ~/.xurl
    fi
  '';
}
