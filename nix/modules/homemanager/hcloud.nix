{ config, lib, pkgs, ... }:

{
  home.packages = [ pkgs.hcloud ];

  age.secrets.hcloud-cli = {
    file = ../../secrets/hcloud-cli.age;
  };

  home.activation.hcloud-cli = lib.hm.dag.entryAfter ["writeBoundary"] ''
    run mkdir -p ~/.config/hcloud
    run ln -sf ${config.age.secrets.hcloud-cli.path} ~/.config/hcloud/cli.toml
  '';
}
