{ pkgs, ... }:
{
  environment.systemPackages = with pkgs; [
    gitmux
    tmux
  ];
}