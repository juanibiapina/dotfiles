{ pkgs, ... }:

{
  environment.systemPackages = with pkgs; [
    nodePackages.typescript-language-server

    # terminal multiplexer
    gitmux
    tmux
  ];

  # Enable direnv for project specific environment variables
  programs.direnv = {
    enable = true;
    silent = true;
    nix-direnv.enable = true;
    settings = {
      whitelist = {
        exact = ["~/workspace/contentful" "~/workspace/ninetailed-inc"];
      };
    };
  };

  homebrew = {
    enable = true;

    taps = [
      "jesseduffield/lazygit"
    ];

    brews = [
      # bash
      "bash"
      "bash-language-server"
      "coreutils"

      # git
      "gh"
      "git"
      "git-crypt"
      "git-delta"
      "hub"
      "lazygit"

      # charm
      "glow" # terminal markdown viewer
      "gum" # shell scripting UI toolkit

      # CLI tools
      "jira-cli" # Command-line interface for Jira

      # go
      "go"
      "gofumpt" # go formatter
      "golangci-lint" # go linter
      "gopls" # go language server

      # lua
      "lua-language-server" # language server
      "luarocks" # package manager
      "stylua" # formatter

      # markdown
      "markdown-oxide" # markdown language server

      # nodejs
      "node" # Node.js runtime

      # python
      "uv" # Python package and project manager

      # ruby
      # ruby-build dependencies
      # https://github.com/rbenv/ruby-build/wiki#suggested-build-environment
      "autoconf"
      "gmp"
      "libyaml"
      "openssl"
      "readline"

      "libpq" # PostgreSQL client libraries, for pg gem

      # tools
      "gpg" # gnu privacy guard
      "htop" # interactive process viewer
      "jq" # command-line JSON processor
      "mise" # version manager
      "ncdu" # disk usage analyzer
      "openssl" # SSL and TLS toolkit
      "parallel" # shell tool for parallel execution
      "stow" # dotfiles manager
      "superfile" # file manager
      "terminal-notifier" # macOS terminal notifier
      "tree" # directory tree viewer
      "wakeonlan" # send magic packets to wake up computers
      "watch" # execute a program periodically, showing output
      "wget" # network downloader
    ];

    casks = [
      # docker
      "orbstack" # https://docs.orbstack.dev/
    ];
  };
}
