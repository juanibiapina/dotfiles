# Bridges the syncthing "passwords" folder to pCloud, where Keepass2Android on
# the phone reads the database from.
#
#   Mac (KeePassXC) <--syncthing--> mini:~/Sync/passwords (rclone FUSE mount)
#                                     <--> pCloud <--> phone (Keepass2Android)
#
# mini is the only device that talks to pCloud, so when this bridge breaks the
# phone silently keeps reading a stale database while both Macs report
# "Up to Date" (they are in sync with each other, just not with pCloud).
# That happened for 28 days between 2026-07-06 and 2026-08-03. See
# docs/pcloud.md for the full failure mode.
#
# This module owns the whole bridge: the mount, its startup ordering against
# syncthing, its self-healing, and its alerting.
{ config, lib, pkgs, ... }:
with lib;
let
  cfg = config.modules.pcloud-passwords;

  guiAddress = config.services.syncthing.guiAddress;
  syncthingConfigXml = "${config.services.syncthing.configDir}/config.xml";

  # Must be the setuid wrapper, and must be absolute: systemd resolves Exec*
  # binaries against its own PATH, not the unit's Environment=, so the bare
  # "fusermount" this unit used to call never ran at all
  # ("Failed at step EXEC spawning fusermount: No such file or directory").
  fusermount = "/run/wrappers/bin/fusermount";

  # The mount is considered ready only once it actually serves reads.
  #
  # Checking `mountpoint` alone is not enough: syncthing's initial scan used to
  # race a mounted-but-cold rclone VFS and fail with "folder marker missing",
  # then "stat .stfolder: input/output error". A directory listing is the
  # cheapest predicate that exercises the same read path.
  #
  # Deliberately not checking for .stfolder itself: that is a syncthing
  # implementation detail, and gating on it would make this unit flap forever
  # if the marker were ever genuinely deleted on pCloud.
  waitForMount = pkgs.writeShellApplication {
    name = "pcloud-passwords-wait";
    runtimeInputs = with pkgs; [ util-linux coreutils ];
    text = ''
      for _ in $(seq 1 60); do
        if mountpoint -q "${cfg.path}" && ls -1 "${cfg.path}" >/dev/null 2>&1; then
          exit 0
        fi
        sleep 1
      done
      echo "timed out waiting for ${cfg.path} to serve reads" >&2
      exit 1
    '';
  };

  # A failed or killed rclone leaves a stale FUSE endpoint behind, after which
  # every subsequent start dies with "Transport endpoint is not connected" until
  # someone unmounts by hand. Clear it unconditionally before mounting;
  # unmounting a path that is not mounted is harmless.
  prepareMount = pkgs.writeShellApplication {
    name = "pcloud-passwords-prepare";
    runtimeInputs = with pkgs; [ coreutils ];
    text = ''
      ${fusermount} -uz "${cfg.path}" 2>/dev/null || true
      mkdir -p "${cfg.path}"
    '';
  };

  # Ordering alone is not enough. Syncthing does not recover a folder error on
  # its own: the 2026-07-06 error state survived 28 days of uptime and only
  # cleared after a manual POST /rest/db/scan. This watchdog performs that same
  # recovery automatically, and pushes to the phone when recovery keeps failing.
  healthCheck = pkgs.writeShellApplication {
    name = "pcloud-passwords-health";
    runtimeInputs = with pkgs; [ curl jq util-linux coreutils gnused systemd ];
    text = ''
      counter="$STATE_DIRECTORY/consecutive-failures"
      [ -f "$counter" ] || echo 0 > "$counter"

      notify() {
        if [ ! -r "${cfg.ntfyTopicFile}" ]; then
          echo "ntfy topic unreadable at ${cfg.ntfyTopicFile}, skipping push" >&2
          return 0
        fi
        topic=$(tr -d '[:space:]' < "${cfg.ntfyTopicFile}")
        curl -sf \
          -H "Title: mini passwords sync" \
          -H "Priority: high" \
          -d "$1" \
          "https://ntfy.sh/$topic" >/dev/null ||
          echo "failed to send ntfy notification" >&2
      }

      # Only page once the problem has outlived a few self-healing attempts,
      # then reset so a persistent fault does not push every five minutes.
      fail() {
        n=$(( $(cat "$counter") + 1 ))
        echo "$n" > "$counter"
        if [ "$n" -ge 3 ]; then
          notify "$1"
          echo 0 > "$counter"
        fi
      }

      if ! mountpoint -q "${cfg.path}" || ! ls -1 "${cfg.path}" >/dev/null 2>&1; then
        echo "mount at ${cfg.path} is unhealthy, restarting the mount" >&2
        fail "pCloud mount unhealthy, restarting. The phone may have a stale password database."
        # The mount unit retries on its own, so a restart that does not come up
        # immediately is not a failure of this check.
        systemctl restart pcloud-passwords.service || true
        exit 0
      fi

      # Read the key syncthing generated rather than keeping a second copy of
      # it. If this ever gets brittle, set services.syncthing.settings.gui.apiKey
      # from an agenix secret and read it from there instead.
      apikey=$(sed -n 's:.*<apikey>\(.*\)</apikey>.*:\1:p' "${syncthingConfigXml}" | head -1)
      if [ -z "$apikey" ]; then
        echo "could not read syncthing api key from ${syncthingConfigXml}" >&2
        exit 1
      fi

      if ! status=$(curl -sf -H "X-API-Key: $apikey" \
        "http://${guiAddress}/rest/db/status?folder=${cfg.syncthingFolder}"); then
        echo "syncthing rest api at ${guiAddress} is unreachable" >&2
        exit 1
      fi

      folder_error=$(printf '%s' "$status" | jq -r '.error // ""')
      if [ -n "$folder_error" ]; then
        echo "folder ${cfg.syncthingFolder} is in error state: $folder_error" >&2
        echo "triggering a rescan to recover" >&2
        curl -sf -X POST -H "X-API-Key: $apikey" \
          "http://${guiAddress}/rest/db/scan?folder=${cfg.syncthingFolder}" >/dev/null
        fail "syncthing folder ${cfg.syncthingFolder} errored: $folder_error"
        exit 0
      fi

      echo 0 > "$counter"
    '';
  };
in
{
  options.modules.pcloud-passwords = {
    enable = mkEnableOption "pcloud passwords bridge";

    remote = mkOption {
      type = types.str;
      default = "pcloud:/Applications/Keepass2Android";
      description = "rclone remote holding the KeePass database";
    };

    path = mkOption {
      type = types.str;
      default = "/home/juan/Sync/passwords";
      description = "Local mountpoint, also the syncthing folder path";
    };

    syncthingFolder = mkOption {
      type = types.str;
      default = "passwords";
      description = "Syncthing folder id backed by this mount";
    };

    user = mkOption {
      type = types.str;
      default = "juan";
      description = "User owning the mount";
    };

    group = mkOption {
      type = types.str;
      default = "users";
      description = "Group owning the mount";
    };

    ntfyTopicFile = mkOption {
      type = types.str;
      default = config.age.secrets.ntfy-topic.path;
      defaultText = "config.age.secrets.ntfy-topic.path";
      description = "File containing the ntfy topic used for alerts";
    };
  };

  config = mkIf cfg.enable {
    age.secrets.ntfy-topic.file = ../../../secrets/ntfy-topic.age;

    systemd.services.pcloud-passwords = {
      description = "Mount pcloud passwords drive";
      wantedBy = [ "default.target" ];
      after = [ "network.target" ];
      script = ''
        ${pkgs.rclone}/bin/rclone mount \
          --vfs-cache-mode full \
          --config /home/juan/.config/rclone/rclone.conf \
          --allow-other \
          ${cfg.remote} ${cfg.path}
      '';
      serviceConfig = {
        User = cfg.user;
        Group = cfg.group;

        # Required if using --allow-other
        UMask = "0027";

        # workaround for:
        # mount helper error: fusermount3: mount failed: Operation not permitted
        # Fatal error: failed to mount FUSE fs: fusermount: exit status 1
        # https://github.com/NixOS/nixpkgs/issues/96928
        Environment = [ "PATH=/run/wrappers/bin/:$PATH" ];

        ExecStartPre = "${prepareMount}/bin/pcloud-passwords-prepare";

        # For Type=simple, systemd holds the unit in "activating" until
        # ExecStartPost returns, so units ordered After= genuinely wait for a
        # readable mount rather than for the rclone process to be spawned.
        # A timeout here fails the unit, which Restart=on-failure retries.
        ExecStartPost = "${waitForMount}/bin/pcloud-passwords-wait";

        # Directory must be manually unmounted after systemd kills rclone.
        # Leading "-" so a failed unmount does not fail the stop job;
        # ExecStartPre cleans up whatever is left over.
        ExecStop = "-${fusermount} -uz ${cfg.path}";

        # Retry settings
        Restart = "on-failure";
        RestartSec = 10;
      };

      # StartLimitIntervalSec belongs to [Unit]; in [Service] systemd ignored it
      # and logged "Unknown key" on every start. 0 disables rate limiting, so the
      # mount keeps retrying until pcloud is reachable.
      unitConfig.StartLimitIntervalSec = 0;

      # The readiness gate above is what makes this ordering meaningful.
      # Ordering only, never Requires: syncthing also serves the secrets, notes
      # and dropbox folders, and a pCloud outage must not take those down.
      before = [ "syncthing.service" ];
    };

    systemd.services.pcloud-passwords-health = {
      description = "Recover the pcloud passwords bridge when it breaks";
      after = [ "syncthing.service" ];
      serviceConfig = {
        Type = "oneshot";
        StateDirectory = "pcloud-passwords";
        ExecStart = "${healthCheck}/bin/pcloud-passwords-health";
      };
    };

    systemd.timers.pcloud-passwords-health = {
      description = "Periodic health check of the pcloud passwords bridge";
      wantedBy = [ "timers.target" ];
      timerConfig = {
        OnBootSec = "5min";
        OnUnitActiveSec = "5min";
      };
    };

    # Second, independent signal. Prometheus already scrapes syncthing (see
    # ./prometheus.nix) and /metrics answers without auth.
    #
    # "need bytes above zero" describes the user-visible symptom (mini is
    # behind) and is stable across syncthing versions, unlike the unlabelled
    # enum in syncthing_model_folder_state. Scoped to this folder because the
    # 2GB dropbox folder can legitimately sit behind for over an hour.
    services.prometheus.rules = [
      (builtins.toJSON {
        groups = [{
          name = "pcloud-passwords";
          rules = [{
            alert = "SyncthingPasswordsFolderBehind";
            expr = ''syncthing_model_folder_summary{folder="${cfg.syncthingFolder}",scope="need",type="bytes"} > 0'';
            for = "1h";
            labels.severity = "warning";
            annotations.summary = "mini is behind on the ${cfg.syncthingFolder} folder, the phone is reading a stale database";
          }];
        }];
      })
    ];
  };
}
