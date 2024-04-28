{ pkgs, nixpkgs_pcloud_working, ... }:

{
  environment.systemPackages = with pkgs; [
    # browsers
    chromium
    firefox-devedition-bin
    vivaldi

    # coding
    (callPackage ../../packages/nvim.nix {})
    nil # Nix language server
    nodePackages.typescript-language-server
    ripgrep # grep
    terraform-ls # Terraform language server
    vim # for running dotfiles tests
    watchexec # file watcher

    # desktop
    alacritty # terminal
    dex # autostart apps using XDG autostart
    discord # chat
    dmenu # launcher
    dunst # notification daemon
    dwm # window manager
    gimp # image editor
    gnome.cheese # webcam testing
    gnome.nautilus # file manager
    gnome.zenity # displaying dialogs from shell scripts
    keepassxc # password manager
    obsidian # note taking
    shotgun # screenshot tool
    slack # chat
    slop # screen selection tool
    spotifywm # music player
    xbindkeys # global keyboard shortcuts
    zathura # pdf viewer
    zoom-us # zoom meeting client
    # rofi
    (
      pkgs.rofi.override { plugins = [ pkgs.rofi-emoji ]; }
    )

    # tools
    tesseract # OCR

    # shell
    bat # required for man
    direnv
    fd
    fzf
    glow # markdown viewer
    htop
    hyperfine
    jq

    awscli2
    cachix
    cmake
    dropbox
    file
    filezilla
    gcc
    gh
    git
    git-crypt
    gitAndTools.delta
    gitAndTools.hub
    glxinfo
    gnumake
    gnupg
    killall
    lazygit
    libnotify
    lsof
    lxappearance
    mpv
    ncdu
    nixpkgs_pcloud_working.pcloud
    nodejs # for Github Copilot vim plugin
    papirus-icon-theme
    parallel
    pasystray
    pavucontrol
    pciutils
    python3
    ruby
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
    zip
    (callPackage ../../packages/sub.nix {})
  ];
}
