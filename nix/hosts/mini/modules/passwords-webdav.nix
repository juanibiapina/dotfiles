{ config, lib, ... }:

let
  webdav = config.services.webdav;
  tailscale = lib.getExe config.services.tailscale.package;
  httpsPort = 8443;
in
{
  age.secrets.passwords-webdav-env.file = ../../../secrets/passwords-webdav-env.age;

  services.webdav = {
    enable = true;
    user = "juan";
    group = "users";
    environmentFile = config.age.secrets.passwords-webdav-env.path;
    settings = {
      address = "127.0.0.1";
      port = 8085;
      directory = "/home/juan/Sync/passwords";
      permissions = "R";
      users = [
        {
          username = "juan";
          password = "{env}WEBDAV_PASSWORD";
          permissions = "CRUD";
        }
      ];
    };
  };

  systemd.services.passwords-webdav-https = {
    description = "Private HTTPS access to passwords WebDAV";
    wantedBy = [ "multi-user.target" ];
    requires = [ "tailscaled.service" "webdav.service" ];
    after = [ "tailscaled.service" "webdav.service" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      ExecStart = "${tailscale} serve --bg --yes --https=${toString httpsPort} http://${webdav.settings.address}:${toString webdav.settings.port}";
      ExecStop = "${tailscale} serve --https=${toString httpsPort} off";
    };
  };
}
