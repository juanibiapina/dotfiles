{ ... }:

{
  system.defaults.CustomUserPreferences = {
    "com.apple.symbolichotkeys" = {
      AppleSymbolicHotKeys = {
        # Disable default screenshot shortcuts
        "28" = { enabled = 0; };  # ⇧⌘3 - Save picture of screen
        "29" = { enabled = 0; };  # ⌃⇧⌘3 - Copy picture of screen
        "184" = { enabled = 0; }; # ⇧⌘5 - Screenshot options

        # Remap area screenshot shortcuts to use 'e' key
        "30" = {
          enabled = 1;
          value = {
            parameters = [ 101 14 1179648 ];  # ⇧⌘E - Save picture of area
            type = "standard";
          };
        };
        "31" = {
          enabled = 1;
          value = {
            parameters = [ 101 14 1441792 ];  # ⌃⇧⌘E - Copy picture of area
            type = "standard";
          };
        };
      };
    };
  };
}
