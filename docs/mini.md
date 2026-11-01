# mini

Commands to inspect and debug the services on the `mini` host.

## Headless Chromium

`nix/hosts/mini/modules/headless-wayland.nix` runs Chromium with the browse-cli extension as the system service `sway-chromium`. Chromium exits when its last tab closes, and each start opens a single New Tab page.

```bash
systemctl status sway-chromium
systemctl list-timers sway-chromium-restart
browse tab.list
```

## Scheduled agent jobs

`nix/hosts/mini/agent-jobs.nix` declares the jobs, and `nix/hosts/mini/modules/agent-jobs.nix` defines the option that turns them into services and timers. Job prompts run unattended, so they must not wait for input.

```bash
systemctl list-timers 'agent-job-*'
sudo systemctl start --no-block agent-job-<name>
journalctl -u agent-job-<name>
```

## Software factory

The `factory-pickup` user timer (`nix/hosts/mini/modules/factory.nix`) runs `dev factory pickup`, which starts a coordinator for each new `factory` issue and removes the terminals of finished runs. Coordinators and workers are herdr-core terminals, shown in Herdr with one space per clone (id `factory-<clone>`, named after the clone until renamed) and one tab per issue. The `factory` skill describes the rest.

```bash
systemctl --user list-timers factory-pickup
journalctl --user -u factory-pickup
hc ls --label factory.role=coordinator   # running coordinators
hc ls --label factory.run=<clone>-<n>     # one run's coordinator
hc attach <t>                             # take over a coordinator
```

For a finished run that got no retro from its coordinator, run `/factory-retro <owner/repo>#<n>` by hand in the factory clone.
