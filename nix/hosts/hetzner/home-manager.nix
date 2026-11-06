{ lib, pkgs, ... }:

{
  imports = [
    ../../modules/syncthing.nix
    ../../modules/homemanager/agents.nix
    ../../modules/homemanager/bat.nix
    ../../modules/homemanager/gh.nix
    ../../modules/homemanager/pi-extensions.nix
    ../../modules/homemanager/browse-cli.nix
  ];

  home.username = "juan";

  # Only the KeePass database, so kp works here. Syncthing made the device key on first setup, in
  # ~/.local/state/syncthing; a reinstall makes a new one, whose ID goes in nix/modules/syncthing.nix.
  services.syncthing.settings.folders = lib.mkForce {
    passwords = {
      path = "~/Sync/passwords";
      devices = [ "mini" "macm1" "mb5p" ];
    };
    # The Minecraft server's daily backups (juanibiapina/minecraft bin/backup keeps the newest two); mini mirrors them.
    minecraft-backups = {
      path = "~/Sync/minecraft-backups";
      devices = [ "mini" ];
      type = "sendonly";
    };
  };

  # The Minecraft server and what serves and watches it, from juanibiapina/minecraft (its AGENTS.md):
  # started at boot and again whenever they exit. Each runs in a login shell, as the repo's scripts
  # expect (TYPESAFE_API_KEY, pi, nix). The bots themselves stay in tmux.
  systemd.user.services = let
    repo = "/home/juan/workspace/juanibiapina/minecraft";
    minecraftService = description: command: extra: {
      Unit.Description = description;
      Service = {
        WorkingDirectory = repo;
        ExecStart = "${pkgs.zsh}/bin/zsh -lc ${lib.escapeShellArg "exec ${command}"}";
        Restart = "always";
        RestartSec = 5;
      } // extra;
      Install.WantedBy = [ "default.target" ];
    };
  in {
    minecraft-server = minecraftService "Minecraft server (bin/server)" "bin/server" {
      Environment = "SERVER_MEMORY=3584M";
      # Java quits on SIGTERM without logging a save, so stop through the game's own stop command, which
      # saves every world, and wait for the process to end before systemd signals what is left. It is
      # sent until the server is gone, since RCON doesn't listen yet while the server starts.
      ExecStop = "${pkgs.zsh}/bin/zsh -lc ${lib.escapeShellArg "while kill -0 $MAINPID 2>/dev/null; do bin/server-command stop >/dev/null 2>&1; sleep 2; done"}";
      TimeoutStopSec = 120;
      SuccessExitStatus = 143;
    };
    minecraft-web = minecraftService "Minecraft control page (bin/web)" "bin/web" { };
    minecraft-tunnel = minecraftService "Cloudflare tunnel for the Minecraft control page (bin/tunnel)" "bin/tunnel" { };
    minecraft-observer = minecraftService "Minecraft bots' monitor (bin/observer)" "bin/observer" { };

    minecraft-backup = {
      Unit.Description = "Back up the Minecraft server into ~/Sync/minecraft-backups";
      Service = {
        Type = "oneshot";
        ExecStart = "${repo}/bin/backup";
        Environment = "PATH=${lib.makeBinPath [ pkgs.mcrcon ]}:/run/current-system/sw/bin";
      };
    };
  };
  systemd.user.timers.minecraft-backup = {
    Unit.Description = "Daily Minecraft backup";
    Timer = {
      OnCalendar = "*-*-* 05:00:00";
      Persistent = true;
    };
    Install.WantedBy = [ "timers.target" ];
  };

  # Home Manager release this config was first written against. Do not bump.
  home.stateVersion = "26.11";
}
