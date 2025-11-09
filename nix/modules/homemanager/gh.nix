{ pkgs, ... }:

{
  programs.gh = {
    enable = true;
    extensions = [ pkgs.gh-notify ];
  };
}
