{ pkgs, nixpkgs_pcloud_working, ... }:

{
  environment.systemPackages = with pkgs; [
    # browsers
    firefox-devedition-bin
    qutebrowser
    vivaldi

    # desktop
    alacritty # terminal
    dex # autostart apps using XDG autostart
    discord # chat
    dropbox
    dunst # notification daemon
    gimp # image editor
    gnome.cheese # webcam testing
    gnome.nautilus # file manager
    gnome.zenity # displaying dialogs from shell scripts
    keepassxc # password manager
    obsidian # note taking
    shotgun # screenshot tool
    slop # screen selection tool
    xbindkeys # global keyboard shortcuts
    zathura # pdf viewer
    zoom-us # zoom meeting client
    ulauncher # launcher
    # rofi
    (
      pkgs.rofi.override { plugins = [ pkgs.rofi-emoji ]; }
    )

    # music
    kitty # so I can see album covers when running spotify-player
    spotifywm # music player
    spotify-player # music player


    # tools
    tesseract # OCR

    # shell
    glow # markdown viewer
    htop
    hyperfine
    jq

    awscli2
    cmake
    file
    gcc
    gh
    gitAndTools.hub
    gnumake
    gnupg
    killall
    libnotify
    lsof
    lxappearance
    nixpkgs_pcloud_working.pcloud
    papirus-icon-theme
    parallel
    pasystray
    pavucontrol
    pciutils
    python3
    ruby
    ssm-session-manager-plugin
    tree
    udiskie
    universal-ctags
    unzip
    usbutils
    vlc
    wmctrl
    xclip
    xdotool
    xorg.xev
    xsel
    yq-go
    zip
  ];
}
