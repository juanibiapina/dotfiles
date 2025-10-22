{ pkgs, inputs, writeShellApplication, wrapNeovim, vimPlugins, stdenv, lib }:

let
# Link together all treesitter grammars into single derivation
# Only parsers are linked because the queries in the plugins are not compatible
# with nvim-treesitter, which distributes their own queries.
grammarsPath = stdenv.mkDerivation rec {
  name = "nvim-nix-treesitter-grammars";
  inherit (vimPlugins.nvim-treesitter.withAllGrammars) dependencies;
  buildInputs = dependencies;
  phases = [ "installPhase" ];
  installPhase = ''
    mkdir -p "$out/parser"
    for dep in ${lib.concatStringsSep " " (map (dep: "${dep}/parser") dependencies)}
    do
      ln -s "$dep"/* "$out/parser/"
    done
  '';
};

# wrap neovim
wrapped = wrapNeovim inputs.neovim-nightly.packages.${pkgs.system}.default {
  configure = {
    customRC = /* vim */ ''
      " Load vim-plug
      source ${vimPlugins.vim-plug}/plug.vim

      " Add nvim-treesitter to runtimepath
      set rtp^=${vimPlugins.nvim-treesitter}

      " Add treesitter grammars to runtimepath
      set rtp^=${grammarsPath}

      " Load configuration from default location
      source $HOME/.config/nvim/init.lua
    '';
  };
};

# wrap neovim
wrapped-plugged = wrapNeovim inputs.neovim-nightly.packages.${pkgs.system}.default {
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
