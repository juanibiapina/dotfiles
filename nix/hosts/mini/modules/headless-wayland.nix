{ config, lib, pkgs, ... }:

with lib;
let
  cfg = config.modules.headless-wayland;
in {
  options.modules.headless-wayland = {
    enable = mkEnableOption "headless Wayland session with VNC access";

    vncPort = mkOption {
      type = types.port;
      default = 5900;
      description = "Port for wayvnc to listen on";
    };

    resolution = mkOption {
      type = types.str;
      default = "1920x1080@60";
      description = "Resolution for the headless display";
    };
  };

  config = mkIf cfg.enable {
    # Open VNC port in firewall
    networking.firewall.allowedTCPPorts = [ cfg.vncPort ];

    # Sway headless session (using unwrapped to avoid dbus-run-session wrapper)
    systemd.services.sway-headless = {
      description = "Sway compositor in headless mode";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];

      path = [ pkgs.foot pkgs.chromium pkgs.dmenu ];

      environment = {
        WLR_BACKENDS = "headless";
        WLR_LIBINPUT_NO_DEVICES = "1";
        XDG_RUNTIME_DIR = "/run/user/1000";
        XDG_SESSION_TYPE = "wayland";
      };

      serviceConfig = {
        User = "juan";
        Group = "users";
        ExecStart = "${pkgs.sway-unwrapped}/bin/sway";
        Restart = "always";
        RestartSec = 5;
      };
    };

    # Set resolution after sway starts
    systemd.services.sway-headless-setup = {
      description = "Configure headless sway display";
      wantedBy = [ "multi-user.target" ];
      after = [ "sway-headless.service" ];
      requires = [ "sway-headless.service" ];

      environment = {
        WAYLAND_DISPLAY = "wayland-1";
        XDG_RUNTIME_DIR = "/run/user/1000";
      };

      serviceConfig = {
        Type = "oneshot";
        User = "juan";
        Group = "users";
        ExecStartPre = "${pkgs.coreutils}/bin/sleep 2";
        ExecStart = "${pkgs.wlr-randr}/bin/wlr-randr --output HEADLESS-1 --custom-mode ${cfg.resolution}";
        RemainAfterExit = true;
      };
    };

    # wayvnc for remote access
    systemd.services.wayvnc = {
      description = "VNC server for Wayland";
      wantedBy = [ "multi-user.target" ];
      after = [ "sway-headless-setup.service" ];
      requires = [ "sway-headless.service" ];

      environment = {
        WAYLAND_DISPLAY = "wayland-1";
        XDG_RUNTIME_DIR = "/run/user/1000";
      };

      serviceConfig = {
        User = "juan";
        Group = "users";
        ExecStart = "${pkgs.wayvnc}/bin/wayvnc 0.0.0.0 ${toString cfg.vncPort}";
        Restart = "always";
        RestartSec = 5;
      };
    };

    # Install required packages
    environment.systemPackages = with pkgs; [
      sway-unwrapped  # Compositor (unwrapped for systemd)
      sway            # Also install wrapped version for swaymsg, swaybar, etc.
      wayvnc
      wlr-randr
      foot            # Terminal emulator
      dmenu           # App launcher (Mod+d)
      chromium
    ];
  };
}
