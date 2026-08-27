{ config, ... }:

{
  # Ship the shared adb identity so this host presents the same key the phone
  # already trusts ("Always allow from this computer"). No auth dialog is then
  # needed on a headless host. agenix decrypts straight to ~/.android so adb
  # finds the keypair; letting agenix own the path avoids activation ordering
  # races with a manual copy.
  age.secrets.adbkey = {
    file = ../../secrets/adbkey.age;
    path = "${config.home.homeDirectory}/.android/adbkey";
    mode = "600";
    symlink = false;
  };
  age.secrets.adbkey-pub = {
    file = ../../secrets/adbkey-pub.age;
    path = "${config.home.homeDirectory}/.android/adbkey.pub";
    mode = "644";
    symlink = false;
  };
}
