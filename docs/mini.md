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

A job with `user = true` runs as a user unit, so it can reach herdr-core (`hc`); `extensions = true` loads pi's extensions, which the Zero MCP needs; a `gate` script runs first, and the agent starts only when it exits 0. Inspect those with `systemctl --user` and `sudo journalctl _SYSTEMD_USER_UNIT=agent-job-<name>.service`.

## Inbox triage

The `inbox` job (`agents/jobs/inbox.md`) runs every 15 minutes. It turns new Zero recordings into Zero Prompts and acts on the answers in a later run: approved ideas become GitHub issues for the factory. Zero marks the Recordings and Prompts it has handled; `~/.local/state/inbox/state.json` keeps the ids of the Prompts it asked. `agents/jobs/inbox-gate` calls the Zero MCP over HTTP with pi's OAuth token and starts the agent only when there is an unhandled Recording, or an unhandled answer to one of its Prompts; when the token has expired it starts the agent anyway, and pi refreshes the token.

## GitHub notifications

The `notifications` job (`agents/jobs/clean-notifications.md`) runs at 05:00 Berlin on the GitHub Copilot subscription, two hours after Dependabot opens its PRs at 03:00 Berlin. It merges green minor and patch bumps and marks merged, closed, released, and fixed notifications done. Read its report with `journalctl -u agent-job-notifications`.

## Software factory

The `factory-pickup` user timer (`nix/hosts/mini/modules/factory.nix`) runs `dev factory pickup`, which starts a coordinator for each new `factory` issue and removes the terminals of finished runs. Coordinators and workers are herdr-core terminals, shown in Herdr with one space per clone (id `factory-<clone>`, named after the clone until renamed) and one tab per issue. The `factory` skill describes the rest.

```bash
systemctl --user list-timers factory-pickup
journalctl --user -u factory-pickup
hc ls --label factory.role=coordinator   # running coordinators
hc ls --label factory.run=<clone>-<n>     # one run's coordinator
hc attach <t>                             # take over a coordinator
```
