{ ... }:

{
  # Install bat and register the tokyonight_moon theme.
  # BAT_THEME is exported by assets/zsh/plugins/bat.sh and is consumed by
  # bat, git-delta and deltoids.
  programs.bat = {
    enable = true;
    themes.tokyonight_moon.src = ../../../assets/bat/themes/tokyonight_moon.tmTheme;
  };
}
