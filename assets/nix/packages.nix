{ pkgs, nixpkgs_pcloud_working, lib, ... }:

{
  environment.systemPackages = with pkgs; [
    # browsers
    chromium
    firefox-devedition-bin
    vivaldi

    # coding
    neovim-unwrapped
    vim
    vscode

    # desktop
    dex # autostart apps using XDG autostart
    gnome.zenity # displaying dialogs from shell scripts
    shotgun # screenshot tool
    slop # screen selection tool
    xbindkeys # global keyboard shortcuts

    # tools
    tesseract # OCR

    # rofi
    (
      pkgs.rofi.override { plugins = [ pkgs.rofi-emoji ]; }
    )

    alacritty
    awscli2
    barrier
    bat # required for man
    cachix
    cmake
    curlie
    direnv
    discord
    dmenu
    dropbox
    dunst
    dwm
    fd
    file
    filezilla
    fzf
    gcc
    gh
    gimp
    git
    git-crypt
    gitAndTools.delta
    gitAndTools.hub
    glxinfo
    gnome.cheese
    gnome.nautilus
    gnumake
    gnupg
    htop
    hyperfine
    jq
    keepassxc
    killall
    lazygit
    libnotify
    lsof
    lxappearance
    mpv
    ncdu
    nixpkgs_pcloud_working.pcloud
    nodejs # for Github Copilot vim plugin
    obs-studio
    obsidian
    papirus-icon-theme
    parallel
    pasystray
    pavucontrol
    pciutils
    python3
    ripgrep
    ruby
    slack
    spotifywm
    ssm-session-manager-plugin
    starship
    stow
    tmux
    tree
    udiskie
    universal-ctags
    unzip
    usbutils
    vlc
    wget
    wmctrl
    xclip
    xdotool
    xorg.xev
    xsel
    yq-go
    zathura # pdf viewer
    zip
    (callPackage ./packages/antr.nix {})
    (callPackage ./packages/sub.nix {})
  ];
}
