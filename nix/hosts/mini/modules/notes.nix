{ config, lib, pkgs, ... }:
with lib;
let cfg = config.modules.notes; in {
  options.modules.notes = {
    enable = mkEnableOption "notes";
  };

  config = mkIf cfg.enable {
    # Autocommit notes on change
    systemd.services.gitwatch-notes = {
      description = "gitwatch for notes";
      wantedBy = [ "default.target" ];
      after = [ "network.target" ];

      serviceConfig = {
        User = "juan";
        Group = "users";
        WorkingDirectory = "/home/juan/Sync/notes";
        ExecStart = "${pkgs.gitwatch}/bin/gitwatch -r origin .";
        Restart = "always";
        RestartSec = 10;
        Environment = "PATH=${pkgs.git}/bin:${pkgs.gnupg}/bin:${pkgs.openssh}/bin:$PATH";
      };
    };

    # Serve Sync directory as S3 (notes/ becomes the "notes" bucket)
    systemd.services.rclone-serve-s3 = {
      description = "Serve Sync directory as S3";
      wantedBy = [ "default.target" ];
      after = [ "network.target" ];

      serviceConfig = {
        User = "juan";
        Group = "users";
        ExecStart = pkgs.writeShellScript "rclone-serve-s3" ''
          AUTH_KEY=$(cat ${config.age.secrets.rclone-serve-s3-auth.path})
          exec ${pkgs.rclone}/bin/rclone serve s3 \
            --addr 127.0.0.1:8070 \
            --auth-key "$AUTH_KEY" \
            /home/juan/Sync
        '';
        Restart = "on-failure";
        RestartSec = 10;
      };
    };

    age.secrets.rclone-serve-s3-auth = {
      file = ../../../secrets/rclone-serve-s3-auth.age;
      owner = "juan";
    };

    age.secrets.cloudflare-ddns-token = {
      file = ../../../secrets/cloudflare-ddns-token.age;
    };

    # Dynamic DNS for s3.juanibiapina.dev
    services.ddclient = {
      enable = true;
      interval = "5min";
      protocol = "cloudflare";
      username = "token";
      passwordFile = config.age.secrets.cloudflare-ddns-token.path;
      domains = [ "s3.juanibiapina.dev" ];
      zone = "juanibiapina.dev";
      ssl = true;
      verbose = true;
    };

    # Caddy reverse proxy for S3 endpoint
    services.caddy.virtualHosts."s3.juanibiapina.dev".extraConfig = ''
      reverse_proxy 127.0.0.1:8070
    '';
  };
}
