{ pkgs, inputs, ... }:

{
  environment.systemPackages = with pkgs; [
    # dotfiles
    vim-full # for running dotfiles tests

    # browsers
    firefox-devedition-bin
    qutebrowser
    vivaldi

    # desktop
    cheese # webcam testing
    discord # chat
    dropbox # cloud file storage
    dunst # notification daemon
    eog # image viewer
    gimp # image editor
    kdePackages.okular # pdf viewer and editor
    keepassxc # password manager
    nautilus # file manager
    slack # chat
    slop # screen selection tool
    sway-audio-idle-inhibit # idle inhibition when audio is playing
    vscode # for jupyter notebooks
    zapzap # whatsapp client
    zenity # displaying dialogs from shell scripts

    # launcher
    (
      pkgs.rofi.override { plugins = [ pkgs.rofi-emoji ]; } # rofi
    )

    # terminals
    inputs.ghostty.packages.x86_64-linux.default # ghostty

    # coding
    bats # bash testing
    cargo # Rust package manager
    go
    gofumpt # go formatter
    golangci-lint # go linter
    gopls # go language server
    lua-language-server # lua language server
    nil # nix language server
    python3 # Python language
    ruby # Ruby language
    rust-analyzer # Rust language server
    rustc # Rust compiler
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
    charm-freeze # take screenshots of terminal or code
    glow # markdown viewer
    htop # process viewer
    hyperfine # benchmarking tool
    jq # json parser
    ncdu # disk usage analyzer
    outils # for md5
    superfile # file manager
    yazi # file manager

    # gaming
    (retroarch.withCores (cores: with cores; [
      snes9x
    ]))

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
