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
    cheese # webcam testing
    dex # autostart apps using XDG autostart
    discord # chat
    dropbox
    dunst # notification daemon
    eog # image viewer
    gimp # image editor
    keepassxc # password manager
    nautilus # file manager
    okular # pdf viewer and editor
    shotgun # screenshot tool
    slack # chat
    slop # screen selection tool
    vscode # for jupyter notebooks
    xbindkeys # global keyboard shortcuts
    xcolor
    zenity # displaying dialogs from shell scripts
    # rofi
    (
      pkgs.rofi.override { plugins = [ pkgs.rofi-emoji ]; }
    )

    # coding
    go
    gopls
    lua-language-server
    terraform-ls # Terraform language server

    # gamedev
    godot_4 # game engine
    imagemagick # image manipulation
    ghostscript # for image magick
    libresprite # sprite editor

    # music
    spotifywm # music player

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
