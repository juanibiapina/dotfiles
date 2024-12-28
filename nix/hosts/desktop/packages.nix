{ pkgs, inputs, ... }:

{
  environment.systemPackages = with pkgs; [
    # browsers
    firefox-devedition-bin
    qutebrowser
    vivaldi

    # desktop
    cheese # webcam testing
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
    zapzap # whatsapp client
    xcolor
    zenity # displaying dialogs from shell scripts

    # launcher
    (
      pkgs.rofi.override { plugins = [ pkgs.rofi-emoji ]; } # rofi
    )

    # terminals
    inputs.ghostty.packages.x86_64-linux.default # ghostty

    # coding
    go
    gopls
    lua-language-server
    terraform-ls # Terraform language server

    # gamedev, audio and video
    audacity # audio editing
    ffmpeg # audio and video editing
    ghostscript # for image magick
    godot_4 # game engine
    imagemagick # image manipulation
    libresprite # sprite editor

    # music
    spotifywm # music player

    # tools
    tesseract # OCR

    # shell
    glow # markdown viewer
    htop # process viewer
    hyperfine # benchmarking tool
    jq # json parser
    yazi # file manager

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
