{ config, ... }:

{
  age.secrets.grafana-admin-password = {
    file = ../../../secrets/grafana-admin-password.age;
    owner = "grafana";
  };

  age.secrets.grafana-secret-key = {
    file = ../../../secrets/grafana-secret-key.age;
    owner = "grafana";
  };

  services.grafana = {
    enable = true;
    settings = {
      server = {
        http_addr = "192.168.188.30";
        http_port = 9080;
        enable_gzip = true;
      };

      security.admin_password = "$__file{${config.age.secrets.grafana-admin-password.path}}";
      security.secret_key = "$__file{${config.age.secrets.grafana-secret-key.path}}";

      analytics.reporting_enabled = false;
    };


    provision = {
      enable = true;

      datasources.settings.datasources = [
        {
          name = "Prometheus";
          type = "prometheus";
          url = "http://${config.services.prometheus.listenAddress}:${toString config.services.prometheus.port}";
        }
      ];

      # Note: removing attributes from the above `datasources.settings.datasources` is not enough for them to be deleted on `grafana`;
      # One needs to use the following option:
      # datasources.settings.deleteDatasources = [ { name = "foo"; orgId = 1; } { name = "bar"; orgId = 1; } ];
    };

  };

  networking.firewall.allowedTCPPorts = [ config.services.grafana.settings.server.http_port ];
}
