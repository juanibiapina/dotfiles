{ pkgs, ... }:

let
  alpaca-cli = import ../../packages/alpaca-cli.nix { inherit pkgs; };
in
{
  imports = [
    ../../modules/base.nix
    ../../modules/macos/system.nix
  ];

  networking.hostName = "juanibiapina"; # this is enforced by Contentful

  modules.system.username = "juan.ibiapina";

  environment.systemPackages = [
    alpaca-cli
  ];

  homebrew = {
    taps = [
      "atlassian/acli"
      "grafana/grafana"
    ];

    brews = [
      "atlassian/acli/acli" # Atlassian CLI
      "grafana/grafana/gcx" # Grafana Cloud CLI
    ];
  };
}
