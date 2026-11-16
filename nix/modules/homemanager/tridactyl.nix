{ pkgs, ... }:

{
  # Tridactyl's native messenger lets the Firefox extension read
  # ~/.config/tridactyl/tridactylrc, which the tridactyl Stow package links.
  home.file."Library/Application Support/Mozilla/NativeMessagingHosts/tridactyl.json".source =
    "${pkgs.tridactyl-native}/lib/mozilla/native-messaging-hosts/tridactyl.json";
}
