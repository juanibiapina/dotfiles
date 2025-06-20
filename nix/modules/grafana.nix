{ config, ... }:

{
  services.grafana = {
    enable = true;
    settings = {
      server = {
        http_addr = "192.168.188.30";
        http_port = 9080;
        enable_gzip = true;
      };

      analytics.reporting_enabled = false;
    };

  };

  networking.firewall.allowedTCPPorts = [ config.services.grafana.settings.server.http_port ];
}
