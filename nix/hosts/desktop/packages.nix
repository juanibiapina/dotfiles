{ pkgs, ... }:

{
  environment.systemPackages = with pkgs; [
    # browsers
    chromium # used for whatsapp
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
    cheese # webcam testing
    eog # image viewer
    nautilus # file manager
    zenity # displaying dialogs from shell scripts
    keepassxc # password manager
    obsidian # note taking
    shotgun # screenshot tool
    slack # chat
    slop # screen selection tool
    xbindkeys # global keyboard shortcuts
    okular # pdf viewer and editor
    vscode # for jupyter notebooks
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
