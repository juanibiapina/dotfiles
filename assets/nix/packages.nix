{ pkgs, nixpkgs_pcloud_working, ... }:

{
  environment.systemPackages = with pkgs; [
    # browsers
    chromium
    firefox-devedition-bin
    vivaldi

    # coding
    (callPackage ./packages/nvim.nix {})
    vim
    vscode
    nil # Nix language server
    nodePackages.typescript-language-server
    terraform-ls # Terraform language server
    watchexec # file watcher

    # desktop
    dex # autostart apps using XDG autostart
    dmenu # launcher
    dunst # notification daemon
    dwm # window manager
    gnome.zenity # displaying dialogs from shell scripts
    shotgun # screenshot tool
    slop # screen selection tool
    xbindkeys # global keyboard shortcuts
    # rofi
    (
      pkgs.rofi.override { plugins = [ pkgs.rofi-emoji ]; }
    )

    # tools
    tesseract # OCR

    # terminal
    alacritty

    # shell
    bat # required for man
    fd
    direnv
    fzf
    glow # markdown viewer
    htop
    hyperfine
    jq

    awscli2
    barrier
    cachix
    cmake
    curlie
    discord
    dropbox
    file
    filezilla
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
    (callPackage ./packages/sub.nix {})
  ];
}
