{ config, ... }:

{
  imports = [
    ../../modules/syncthing.nix
    ../../modules/ssh.nix
  ];

  # Home Manager required configuration
  home.username = "juan.ibiapina";

  # This value determines the Home Manager release that your configuration is
  # compatible with. This helps avoid breakage when a new Home Manager release
  # introduces backwards incompatible changes.
  #
  # You should not change this value, even if you update Home Manager. If you do
  # want to update the value, then make sure to first check the Home Manager
  # release notes.
  home.stateVersion = "23.11"; # Please read the comment before changing.

  # syncthing secrets
  age.secrets.mac16-syncthing-cert = {
    file = ../../secrets/mac16-syncthing-cert.age;
  };

  age.secrets.mac16-syncthing-key = {
    file = ../../secrets/mac16-syncthing-key.age;
  };

  services.syncthing = {
    key = config.age.secrets.mac16-syncthing-key.path;
    cert = config.age.secrets.mac16-syncthing-cert.path;
  };

  # Enable SSH module
  modules.ssh.enable = true;


  # The home.packages option allows you to install Nix packages into your
  # environment.
  home.packages = [
    # # Adds the 'hello' command to your environment. It prints a friendly
    # # "Hello, world!" when run.
    # pkgs.hello

    # # You can also create simple shell scripts directly inside your
    # # configuration. For example, this adds a command 'my-hello' to your
    # # environment:
    # (pkgs.writeShellScriptBin "my-hello" ''
    #   echo "Hello, ${config.home.username}!"
    # '')
  ];

  # Home Manager is pretty good at managing dotfiles. The primary way to manage
  # plain files is through 'home.file'.
  home.file = {
    "workspace/contentful/.envrc".text = ''
      export CODING_AGENT="codex"
      export EMAIL="$EMAIL_CONTENTFUL"
      export GITHUB_TOKEN="$GITHUB_TOKEN_CONTENTFUL"
      export GIT_AUTHOR_EMAIL="$EMAIL_CONTENTFUL"
      export GIT_COMMITTER_EMAIL="$EMAIL_CONTENTFUL"
      export GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519_contentful'
    '';

    "workspace/ninetailed-inc/.envrc".text = ''
      export CODING_AGENT="codex"
      export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN_NINETAILED"
      export EMAIL="$EMAIL_CONTENTFUL"
      export GITHUB_TOKEN="$GITHUB_TOKEN_CONTENTFUL"
      export GIT_AUTHOR_EMAIL="$EMAIL_CONTENTFUL"
      export GIT_COMMITTER_EMAIL="$EMAIL_CONTENTFUL"
      export GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519_contentful'
    '';

    # # Building this configuration will create a copy of 'dotfiles/screenrc' in
    # # the Nix store. Activating the configuration will then make '~/.screenrc' a
    # # symlink to the Nix store copy.
    # ".screenrc".source = dotfiles/screenrc;

    # # You can also set the file content immediately.
    # ".gradle/gradle.properties".text = ''
    #   org.gradle.console=verbose
    #   org.gradle.daemon.idletimeout=3600000
    # '';
  };

  # Home Manager can also manage your environment variables through
  # 'home.sessionVariables'. These will be explicitly sourced when using a
  # shell provided by Home Manager. If you don't want to manage your shell
  # through Home Manager then you have to manually source 'hm-session-vars.sh'
  # located at either
  #
  #  ~/.nix-profile/etc/profile.d/hm-session-vars.sh
  #
  # or
  #
  #  ~/.local/state/nix/profiles/profile/etc/profile.d/hm-session-vars.sh
  #
  # or
  #
  #  /etc/profiles/per-user/juan/etc/profile.d/hm-session-vars.sh
  #
  home.sessionVariables = {
    # EDITOR = "emacs";
  };
}
