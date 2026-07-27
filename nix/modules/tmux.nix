{ pkgs, inputs, ... }:

let
  tmux = import ../packages/tmux.nix {
    inherit pkgs;
    src = inputs.tmux-src;
  };
in
{
  environment.systemPackages = [ tmux ];
}
