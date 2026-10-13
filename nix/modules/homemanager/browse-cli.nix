{ config, osConfig, pkgs, lib, ... }:

let
  pkg = osConfig.packages.browse-cli;
  pkgRoot = "${pkg}/lib/node_modules/@juanibiapina/browse-cli";
  extensionDir = "${config.home.homeDirectory}/.local/share/browse-cli/extension";

  hexToChromeAlphabet = lib.listToAttrs (lib.imap0
    (i: c: { name = c; value = builtins.elemAt (lib.stringToCharacters "abcdefghijklmnop") i; })
    (lib.stringToCharacters "0123456789abcdef"));
  extensionId = lib.concatMapStrings (c: hexToChromeAlphabet.${c})
    (lib.stringToCharacters (builtins.substring 0 32 (builtins.hashString "sha256" extensionDir)));

  hostWrapper = pkgs.writeShellScript "browse-native-host" ''
    cd ${pkgRoot}/native
    exec ${pkgs.nodejs}/bin/node ${pkgRoot}/native/host.cjs
  '';

  manifestDir =
    if pkgs.stdenv.hostPlatform.isDarwin
    then "Library/Application Support/Google/Chrome/NativeMessagingHosts"
    else ".config/chromium/NativeMessagingHosts";
in
{
  options.programs.browse-cli.extensionDir = lib.mkOption {
    type = lib.types.str;
    default = extensionDir;
    readOnly = true;
    description = "Fixed folder holding the unpacked browse-cli Chrome extension";
  };

  config = {
    home.activation.browse-cli-extension = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
      run rm -rf "${extensionDir}"
      run mkdir -p "${extensionDir}"
      run cp -R ${pkgRoot}/dist/. "${extensionDir}/"
      run chmod -R u+w "${extensionDir}"
    '';

    home.file."${manifestDir}/browse.browser.host.json" = {
      force = true;
      text = builtins.toJSON {
        name = "browse.browser.host";
        description = "Browse CLI Native Host";
        path = "${hostWrapper}";
        type = "stdio";
        allowed_origins = [ "chrome-extension://${extensionId}/" ];
      };
    };
  };
}
