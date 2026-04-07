{ pkgs, inputs, writeShellApplication, wrapNeovim, vimPlugins, symlinkJoin }:

let
# Bundle selected treesitter grammars and queries into a single derivation.
# After nixpkgs PR #470883 (nvim-treesitter main branch update), dependencies
# is a list of grammar plugins + query plugins that we merge with symlinkJoin.
grammarsPath = symlinkJoin {
  name = "nvim-treesitter-grammars";
  paths = (vimPlugins.nvim-treesitter.withPlugins (p: [
    # Languages (from LSP config and workspace projects)
    p.astro
    p.bash
    p.c
    p.css
    p.dockerfile
    p.gdscript
    p.go
    p.graphql
    p.html
    p.javascript
    p.json
    p.lua
    p.markdown
    p.markdown_inline
    p.nix
    p.python
    p.ruby
    p.rust
    p.sql
    p.terraform
    p.tsx
    p.typescript
    p.vim
    p.vimdoc
    p.xml

    # Config formats
    p.hcl
    p.ini
    p.make
    p.toml
    p.yaml

    # Git
    p.diff
    p.gitcommit
    p.gitignore
    p.git_rebase

    # Injection grammars (enhance highlighting inside other languages)
    p.comment
    p.jsdoc
    p.luadoc
    p.luap
    p.query
    p.regex

    # Misc
    p.editorconfig
    p.gomod
    p.gosum
    p.mermaid
    p.pem
    p.ssh_config
    p.tmux
  ])).dependencies;
};

# wrap neovim
wrapped = wrapNeovim inputs.neovim-nightly.packages.${pkgs.stdenv.hostPlatform.system}.default {
  configure = {
    customRC = /* vim */ ''
      " Load vim-plug
      source ${vimPlugins.vim-plug}/plug.vim

      " Add nvim-treesitter to runtimepath (plugin + runtime for queries)
      set rtp^=${vimPlugins.nvim-treesitter}
      set rtp^=${vimPlugins.nvim-treesitter}/runtime

      " Add treesitter grammars to runtimepath
      set rtp^=${grammarsPath}

      " Load configuration from default location
      source $HOME/.config/nvim/init.lua
    '';
  };
};

# wrap neovim
wrapped-plugged = wrapNeovim inputs.neovim-nightly.packages.${pkgs.stdenv.hostPlatform.system}.default {
  configure = {
    customRC = /* vim */ ''
      " Load vim-plug
      source ${vimPlugins.vim-plug}/plug.vim

      " Load plugins from the default location
      source $HOME/.config/nvim/lua/plugins.lua
    '';
  };
};
in
{
  nvim = wrapped;
  nvim-server = writeShellApplication {
    name = "nvim-server";
    text = ''
      socket_path=".local/share/nvim/socket"

      # Create directory if it doesn't exist
      mkdir -p "$(dirname "$socket_path")"

      while true; do
        # Remove socket if it already exists (in case nvim crashed)
        rm -f "$socket_path"

        # Start nvim with the socket
        ${wrapped}/bin/nvim --listen "$socket_path" "$@"

        echo "Neovim exited. Restarting..."
        sleep 2
      done
    '';
  };
  nvim-plug-install = writeShellApplication {
    name = "nvim-plug-install";
    text = ''
      # Install plugins using vim-plug
      ${wrapped-plugged}/bin/nvim --headless -c "PlugInstall" -c "PlugUpdate" -c "qa"
    '';
  };
}
