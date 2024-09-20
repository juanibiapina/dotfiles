{ writeShellApplication, wrapNeovim, neovim-unwrapped, vimPlugins, symlinkJoin }:

let
# Link together all treesitter grammars into single derivation
treesitterPath = symlinkJoin {
  name = "nvim-nix-treesitter-parsers";
  paths = vimPlugins.nvim-treesitter.withAllGrammars.dependencies;
};

# wrap neovim
wrapped = wrapNeovim neovim-unwrapped {
  configure = {
    customRC = /* vim */ ''
      " Setting variables here is a clever way to set variables that are
      " different in NixOS and MacOS
      " let g:treesitter_path = "${treesitterPath}"

      " Load vim-plug
      source ${vimPlugins.vim-plug}/plug.vim

      " Add nvim-treesitter to runtimepath
      set rtp^=${vimPlugins.nvim-treesitter}

      " Add nvim-treesitter grammars to runtimepath
      set rtp^=${treesitterPath}

      " Load configuration from default location
      source $HOME/.config/nvim/init.lua
    '';
  };
};
in
writeShellApplication {
  name = "nvim";
  text = ''${wrapped}/bin/nvim --listen "/tmp/nvim.$$.0" "$@"'';
}
