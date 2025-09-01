{ pkgs, inputs, ... }:

{
  environment.systemPackages = with pkgs; [
    # browsers
    firefox-devedition

    # desktop
    cheese # webcam testing
    discord # chat
    dropbox # cloud file storage
    dunst # notification daemon
    eog # image viewer
    gimp # image editor
    kdePackages.okular # pdf viewer and editor
    keepassxc # password manager
    libnotify # desktop notification library
    lxappearance # GTK theme and appearance manager
    nautilus # file manager
    papirus-icon-theme # icon theme
    pasystray # system tray for PulseAudio
    pavucontrol # PulseAudio volume control GUI
    slack # chat
    slop # screen selection tool
    sway-audio-idle-inhibit # idle inhibition when audio is playing
    vlc # media player
    vscode # for jupyter notebooks
    zapzap # whatsapp client

    # launcher
    (
      pkgs.rofi.override { plugins = [ pkgs.rofi-emoji ]; } # rofi
    )

    # terminal
    inputs.ghostty.packages.x86_64-linux.default # ghostty

    # coding
    bats # bash testing
    cargo # Rust package manager
    flyctl # Fly.io CLI tool
    go # go programming language
    gofumpt # go formatter
    golangci-lint # go linter
    gopls # go language server
    lua-language-server # lua language server
    mise # ruby version manager
    nixd # nix language server
    python3 # Python language
    ruby # Ruby language
    rust-analyzer # Rust language server
    rustc # Rust compiler
    terraform-ls # Terraform language server

    # gamedev, audio and video
    audacity # audio editing
    ffmpeg # audio and video editing
    ghostscript # for image magick
    imagemagick # image manipulation

    # music
    spotifywm # music player

    # tools
    charm-freeze # take screenshots of terminal or code
    cmake # cross-platform build system generator
    dig # DNS lookup
    file # determine file type
    gcc # GNU C compiler
    gh # GitHub CLI tool
    gitAndTools.hub # old GitHub CLI tool
    glow # markdown viewer
    gnumake # make
    gnupg # encryption and signing tool (GPG)
    htop # process viewer
    hyperfine # benchmarking tool
    jq # json parser
    killall # terminate processes by name
    lsof # list open files and the processes using them
    ncdu # disk usage analyzer
    outils # for md5
    parallel # run shell jobs in parallel
    pciutils # tools for inspecting PCI devices
    superfile # file manager
    tesseract # OCR
    tree # display directory tree
    udiskie # automount tool for udisks
    universal-ctags # source code indexer and tag generator
    unzip # extract zip archives
    usbutils # tools for inspecting USB devices
    zip # create zip archives

    # gaming
    (retroarch.withCores (cores: with cores; [
      snes9x
    ]))
  ];
}
