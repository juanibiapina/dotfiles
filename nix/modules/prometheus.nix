{ config, ... }:

{
  services.prometheus = {
    enable = true;
    port = 9090;
    globalConfig.scrape_interval = "10s";

    scrapeConfigs = [
      {
        job_name = "node";
        static_configs = [{
          targets = [ "localhost:${toString config.services.prometheus.exporters.node.port}" ];
        }];
      }
    ];
  };

  services.prometheus.exporters.node = {
    enable = true;
    port = 9091;
    enabledCollectors = [ "systemd" ];
    # node_exporter --help
    extraFlags = [ "--collector.ethtool" "--collector.softirqs" "--collector.tcpstat" ];
  };

  networking.firewall.allowedTCPPorts = [ 9090 ];
}
