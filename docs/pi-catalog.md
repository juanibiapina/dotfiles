# Pi session catalog

Each Mac and mini runs `pi-catalog`, a service that indexes the Pi sessions in `~/.pi/agent/sessions` into a SQLite catalog at `~/.local/state/pi-catalog/catalog.sqlite`. `dev pi recent` reads it. Syncthing copies the transcripts to every machine (`nix/modules/homemanager/pi-sessions-sync.nix`), so each machine builds its own catalog from the same files and nothing syncs the database.

`nix/modules/homemanager/pi-catalog.nix` declares the service and `nix/modules/homemanager/pi-catalog/indexer.mjs` is the indexer. It watches the session root and each session directory, so a change reaches the catalog within a second of the transcript changing on disk. It also scans every transcript at startup, after a watcher error, and every 10 minutes; a deleted transcript leaves the catalog at the next scan. The first scan of about 15,000 sessions takes 10 to 30 s on a Mac and about 95 s on mini, and `dev pi recent` warns that results are partial until it finishes.

## Inspect

On a Mac:

```bash
launchctl print gui/$(id -u)/org.nix-community.home.pi-catalog
tail ~/Library/Logs/pi-catalog.log
```

On mini:

```bash
systemctl --user status pi-catalog
sudo journalctl _SYSTEMD_USER_UNIT=pi-catalog.service
```

The Mac log and mini's journal have one line per scan with its session count and duration, and one line per transcript that failed to index.

## Rebuild

The transcripts are the source of truth, so deleting the catalog loses nothing. Stop the service, delete the catalog, and start it again:

```bash
# Mac
launchctl bootout gui/$(id -u)/org.nix-community.home.pi-catalog
rm ~/.local/state/pi-catalog/catalog.sqlite*
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/org.nix-community.home.pi-catalog.plist

# mini
systemctl --user stop pi-catalog
rm ~/.local/state/pi-catalog/catalog.sqlite*
systemctl --user start pi-catalog
```

## Test

```bash
node --test nix/modules/homemanager/pi-catalog/indexer.test.mjs
```
