# Pcloud

Pcloud isn't directly used in any hosts.
The `mini` host syncs `~/Sync/passwords` to pcloud so that KeePass for Android can access it.

## Topology

```
Mac (KeePassXC) <--syncthing--> mini:~/Sync/passwords (rclone FUSE mount)
                                  <--> pCloud <--> phone (Keepass2Android)
```

`mini` is the only device that talks to pCloud. Both Macs reach pCloud only
through it. Everything below is configured in
[`nix/hosts/mini/modules/pcloud-passwords.nix`](../nix/hosts/mini/modules/pcloud-passwords.nix).

## The failure mode this is built around

When the bridge breaks, the phone keeps reading a stale database while both
Macs report "Up to Date". They are in sync with each other, just not with
pCloud, and the syncthing UI has no way to show that difference.

This happened for 28 days, from 2026-07-06 to 2026-08-03. At boot, syncthing
scanned `~/Sync/passwords` before the rclone mount was serving reads and put the
folder into an error state (`folder marker missing`, then
`stat .stfolder: input/output error`). Syncthing never retried its way out:
mini stayed up the whole time and the folder stayed errored until a manual
rescan. A password edited on a Mac on Jul 30 never reached the phone.

Two other bugs made this worse and are also fixed:

- `ExecStop` called a bare `fusermount`. systemd resolves `Exec*` binaries
  against its own PATH, not the unit's `Environment=`, so the stop command
  never ran (`Failed at step EXEC spawning fusermount`). Every unclean stop
  left a stale FUSE endpoint, and every following start died with
  `Transport endpoint is not connected` until someone unmounted by hand.
- `after = [ "pcloud-passwords.service" ]` did not order anything useful,
  because systemd considers the unit started as soon as `rclone` is spawned,
  not when the mount answers reads.

## How it is protected now

**Readiness gate.** The mount unit has an `ExecStartPre` that clears any stale
endpoint, and an `ExecStartPost` that polls until the mountpoint answers a
directory listing. For `Type=simple`, systemd holds the unit in `activating`
until `ExecStartPost` returns, so `syncthing.service` genuinely waits. On
timeout the unit fails and `Restart=on-failure` retries indefinitely, which is
what should happen when pCloud is unreachable at boot.

The ordering is deliberately `Before=` only, never `Requires=`. Syncthing also
serves the `secrets`, `notes` and `dropbox` folders, and a pCloud outage must
not take those down.

**Health watchdog.** `pcloud-passwords-health.timer` runs every 5 minutes. If
the mount stops answering it restarts the mount unit. If syncthing reports the
folder in an error state it triggers `POST /rest/db/scan`, the same recovery
that had to be done by hand. After three consecutive failed checks it pushes an
ntfy notification to the phone, using the topic in the `ntfy-topic` agenix
secret.

**Prometheus rule.** `SyncthingPasswordsFolderBehind` fires when mini has
outstanding bytes for the folder for over an hour. Scoped to this folder,
because the 2GB dropbox folder can legitimately sit behind for that long.

## Checking the bridge by hand

The folder-level "Up to Date" indicator in the syncthing UI does not tell you
whether mini is current. Ask about mini specifically, from any Mac:

```bash
KEY=$(rg -o '<apikey>([^<]*)' -r '$1' ~/Library/Application\ Support/Syncthing/config.xml | head -1)
MINI=GH5VODQ-6LTTY7O-NEJQNYG-DTQE3L5-SL7L66X-Z6LIRPQ-QBBU44N-62BDBQU
curl -s -H "X-API-Key: $KEY" \
  "http://127.0.0.1:8384/rest/db/completion?folder=passwords&device=$MINI"
# want: completion 100, needBytes 0
```

Then confirm what pCloud actually holds, which is what the phone sees. The
mount uses `--vfs-cache-mode full`, so writeback is asynchronous and
"syncthing reports done" does not imply "landed on pCloud":

```bash
ssh mini 'rclone --config ~/.config/rclone/rclone.conf lsl pcloud:/Applications/Keepass2Android'
```

On mini, the folder's own view of its health:

```bash
KEY=$(sed -n 's:.*<apikey>\(.*\)</apikey>.*:\1:p' ~/.config/syncthing/config.xml | head -1)
curl -s -H "X-API-Key: $KEY" 'http://127.0.0.1:8384/rest/db/status?folder=passwords' | jq .error
```

## Conflict files

A rescan after real divergence produces a `passwords.sync-conflict-*.kdbx`.
That is inherent to two devices diverging, not a defect. They are never deleted
automatically: for a password database, keeping both sides is the safe
behaviour. Open both in KeePassXC and compare before removing one.

## Fallback design if the mount keeps flaking

Replace the FUSE mount with `rclone bisync` on a timer: syncthing would own a
real on-disk directory, and a periodic
`rclone bisync ~/Sync/passwords pcloud:/Applications/Keepass2Android` would
reconcile with pCloud. This removes FUSE entirely, makes every failure a loud
unit failure, and keeps syncthing internals such as `.stfolder` off pCloud
where Keepass2Android sees them. It costs a second sync engine with its own
conflict semantics and resync state, and needs `--resync` bootstrapping plus
`--max-delete` guards on a password database.
