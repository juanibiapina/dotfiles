{ config, lib, pkgs, ... }:

let
  settingsDir =
    if pkgs.stdenv.hostPlatform.isDarwin then
      "${config.home.homeDirectory}/Library/Application Support/gitbutler"
    else
      "${config.xdg.configHome}/gitbutler";
  jq = lib.getExe pkgs.jq;
  managed = ./gitbutler-settings.json;
in
{
  home.file.".pi/agent/skills/gitbutler".source =
    config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/.agents/skills/gitbutler";

  home.activation.gitbutler-settings = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
    settings="${settingsDir}/settings.json"
    run mkdir -p "${settingsDir}"
    merged="$(mktemp)"
    if [ -f "$settings" ]; then
      ${jq} --slurpfile managed ${managed} '. * $managed[0]' "$settings" >"$merged" || { warnEcho "Could not parse $settings; leaving managed GitButler settings alone"; rm -f "$merged"; merged=""; }
    else
      ${jq} . ${managed} >"$merged"
    fi
    if [ -n "$merged" ]; then
      if cmp -s "$merged" "$settings"; then
        rm -f "$merged"
      else
        run mv "$merged" "$settings"
      fi
    fi
  '';
}
