{ lib, config, ... }:

let
  profilesDir = "${config.home.homeDirectory}/Library/Application Support/Firefox/Profiles";
in
{
  # Link user.js into every Firefox Developer Edition profile. Profile folder
  # names start with a random prefix, so home.file cannot target them. A
  # profile that does not exist yet (first launch on a new Mac) gets the link
  # on the next switch. macOS blocks processes without access to other apps'
  # data, such as the gob daemon, from listing the profiles.
  home.activation.firefoxUserJs = lib.hm.dag.entryAfter [ "writeBoundary" ] ''
    if [ -d "${profilesDir}" ] && ! ls "${profilesDir}" >/dev/null 2>&1; then
      warnEcho "Cannot read Firefox profiles; run make from a terminal to link user.js"
    fi
    for profile in "${profilesDir}"/*.dev-edition-default; do
      [ -d "$profile" ] || continue
      run ln -sfn ${./firefox-user.js} "$profile/user.js"
    done
  '';
}
