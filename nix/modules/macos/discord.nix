{ pkgs, lib, config, ... }:

let
  cfg = config.modules.system;
  home = config.users.users.${cfg.username}.home;
  disableSounds = pkgs.writers.writePython3Bin "discord-disable-sounds" {
    libraries = [ pkgs.python3Packages.plyvel ];
  } ''
    import json
    import os
    import sys

    import plyvel

    KEY = b"_https://discord.com\x00\x01notifications"
    ENCODINGS = {0: "utf-16-le", 1: "latin-1"}

    if not os.path.isdir(sys.argv[1]):
        sys.exit(0)

    try:
        db = plyvel.DB(sys.argv[1], create_if_missing=False)
    except plyvel.Error as error:
        print(f"discord-disable-sounds: {error}", file=sys.stderr)
        sys.exit(0)

    try:
        raw = db.get(KEY)
        if raw is None or raw[0] not in ENCODINGS:
            sys.exit(0)
        value = json.loads(raw[1:].decode(ENCODINGS[raw[0]]))
        state = value.get("_state")
        if not isinstance(state, dict):
            sys.exit(0)
        if state.get("disableAllSounds") is True:
            sys.exit(0)
        state["disableAllSounds"] = True
        text = json.dumps(value, separators=(",", ":"))
        db.put(KEY, b"\x01" + text.encode("latin-1"))
    finally:
        db.close()
  '';
in
{
  system.activationScripts.postActivation.text = lib.mkAfter ''
    if ! /usr/bin/pgrep -qx Discord; then
      sudo -u ${cfg.username} ${disableSounds}/bin/discord-disable-sounds \
        "${home}/Library/Application Support/discord/Local Storage/leveldb" || true
    fi
  '';
}
