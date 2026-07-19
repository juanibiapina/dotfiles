{ config, ... }:

{
  # deltoids serve — read-only trace reviewer bound to localhost.
  # Reachable from the internet only via the cloudflared tunnel + Access.
  systemd.services.deltoids-serve = {
    description = "deltoids serve — trace reviewer";
    wantedBy = [ "default.target" ];
    after = [ "network.target" ];
    serviceConfig = {
      User = "juan";
      Group = "users";
      Environment = "HOME=/home/juan";
      ExecStart = "${config.packages.deltoids}/bin/deltoids serve --host 127.0.0.1 --port 8788";
      Restart = "on-failure";
      RestartSec = 10;
    };
  };
}
