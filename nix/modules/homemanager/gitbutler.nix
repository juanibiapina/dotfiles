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
  home.file.".claude/skills/gitbutler".source =
    config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/.agents/skills/gitbutler";

  # but-mesh comes from Nix, so its daemon must not replace itself. The variable
  # lives outside the service files, which `but mesh service install` rewrites.
  xdg.configFile."systemd/user/but-mesh.service.d/nix.conf" = lib.mkIf pkgs.stdenv.hostPlatform.isLinux {
    text = ''
      [Service]
      Environment=BUT_MESH_NO_UPDATE=1
    '';
  };

  launchd.agents.but-mesh-env = lib.mkIf pkgs.stdenv.hostPlatform.isDarwin {
    enable = true;
    config = {
      ProgramArguments = [
        "/bin/sh"
        "-c"
        "launchctl setenv BUT_MESH_NO_UPDATE 1; launchctl kickstart -k gui/$(id -u)/dev.but.mesh 2>/dev/null || true"
      ];
      RunAtLoad = true;
    };
  };

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
