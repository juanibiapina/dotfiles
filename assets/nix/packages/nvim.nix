{ writeShellApplication, wrapNeovim, neovim-unwrapped }:

let
wrapped = wrapNeovim neovim-unwrapped {
  configure = {
    customRC = /* vim */ ''
      " Load configuration from default location
      source $HOME/.config/nvim/init.lua
    '';
  };
};
in
writeShellApplication {
  name = "nvim-test";
  text = ''${wrapped}/bin/nvim "$@"'';
}
