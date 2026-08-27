{ config, lib, ... }:

{
  # Ship the shared adb identity so this host presents the same key the phone
  # already trusts ("Always allow from this computer"). No auth dialog is then
  # needed on a headless host.
  age.secrets.adbkey = {
    file = ../../secrets/adbkey.age;
  };
  age.secrets.adbkey-pub = {
    file = ../../secrets/adbkey-pub.age;
  };

  home.activation.adbkey = lib.hm.dag.entryAfter ["writeBoundary"] ''
    run mkdir -p ~/.android
    run install -m 600 ${config.age.secrets.adbkey.path} ~/.android/adbkey
    run install -m 644 ${config.age.secrets.adbkey-pub.path} ~/.android/adbkey.pub
  '';
}
