{ pkgs, nixpkgs_pcloud_working, ... }:

{
  environment.systemPackages = with pkgs; [
    # browsers
    chromium
    firefox-devedition-bin
    vivaldi

    # desktop
    alacritty # terminal
    dex # autostart apps using XDG autostart
    discord # chat
    dmenu # launcher
    dropbox
    dunst # notification daemon
    dwm # window manager
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
    filezilla
    gcc
    gh
    gitAndTools.hub
    glxinfo
    gnumake
    gnupg
    killall
    libnotify
    lsof
    lxappearance
    mpv
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
