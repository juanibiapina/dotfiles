# Herdr

The Herdr app on the Macs opens spaces on `mini` and `hetzner` through herdr-core (`hc`) over ssh.

## herdr-core on the NixOS hosts

`hc` owns its binary in `~/.local/bin/herdr-core` on each NixOS host, as the Herdr app does on the Macs, so Nix does not install it. Run these commands on a Mac, with `<host>` being `mini` or `hetzner`:

```bash
hc machine add <host> --install   # copy the binary to the host
hc machine update <host>          # update it
```

The `herdr-core` user unit (`nix/modules/nixos/herdr-core.nix`) starts the server through a login zsh, so terminals get the login environment. `KillMode=process` keeps the core and its terminals running when the unit restarts or stops.

```bash
systemctl --user status herdr-core
hc server status
hc machine ls        # on a Mac
```

## Herdr app build on the Macs

The Macs run a Herdr app built from the checkout in `~/workspace/herdrdev/herdr-app`, with Juan's branches from the `fork` remote. A local build never updates itself, so update it by pulling and building again:

```bash
cd ~/workspace/herdrdev/herdr-app
mise install zig@0.16.0
ZIG="$(mise where zig@0.16.0)/zig" bash scripts/install-macos
```

The vendored Ghostty needs Zig 0.16; the newer Zig from Homebrew fails to build it. `scripts/install-macos` installs `~/Applications/Herdr.app` without stopping the running window; quit Herdr and open it again to use the new build. Keep no other copy in `/Applications`: Spotlight and the Dock may open the old one, and Herdr points `~/.local/bin/herdr-app` at whichever copy started last. `herdr-app --version` shows the version of the copy that started last.

## Herdr app configuration on the Macs

The `herdr-app` Stow package links the configuration into `~/.config/herdr-app`. Herdr does not draw SVG icons that are symlinks, so `scripts/link-dotfiles.bash` copies the icons instead.

The file watcher of Herdr ignores edits to symlinked files. Its fallback check applies settings, keys, and layouts within about 10 s, but it never reloads a running mod. After you edit a mod, touch the link to send the watcher an event:

```bash
touch -h ~/.config/herdr-app/mods/<name>/main.js
```

`ctrl-space` opens the `prefix` mod, which waits for one key and runs its action. Prefix keys live in the `BINDINGS` table at the top of `mods/prefix/main.js`, not in `keys.json`.

The `juan` layout's sidebar is one `workbench` block. Its Sessions list shows every space with its agents, ordered by machine (this Mac first, then the others by name), then by name, and leaves out factory spaces unless one is active (it then shows last within its machine). `ctrl-space j` and `ctrl-space k` (`tabs-juan.agent-next` and `agent-prev`, also `cmd-]` and `cmd-[`) follow that order and skip snoozed sessions; Herdr's own `agent.next` would also reach every agent the list leaves out. `ctrl-space (` and `ctrl-space )` (`tabs-juan.space-prev` and `space-next`) follow it too. A space on another machine shows the machine's name at the right of its row, and a factory space (id `factory-<clone>`, from `dev factory pickup`) shows a `factory` tag. The `switch` picker still lists factory spaces. Below the list, it draws the focused session's context and jobs, then Git, System and Claude Plan at the bottom, all from `starmux snapshot`, run on the active space's machine; a machine without a starmux that has `snapshot` leaves them empty. The list always takes its full height. Everything below it scrolls as one area, with spare room above the bottom part.

`ctrl-space o` opens the notes space, like `dev notes` in tmux: the `notes` mod goes there, or back to the previous space when already there, and makes it in `~/Sync/notes` with an editor tab and a pi tab the first time. The space's id is in `shared("notes.space")`. The `switch` picker leaves it out of its list; the Sessions list in `workbench` shows it like any other space. `ctrl-space (` and `ctrl-space )` still count it.

On the phone, the `classic` layout has a Notes tab beside Spaces: the `notes` mod lists the pi sessions of the `notes` space on mini, and its + starts pi there, first opening the space in `~/Sync/notes` on mini when it isn't open. Its badge counts blocked and finished sessions. Snoozed sessions are left out of both, and the Spaces screen lists them in a Snoozed section at the bottom. Like desktop, the phone misses edits to a symlinked file until the link itself changes: run `touch -h` on the link under `~/.config/herdr-mobile`.

`ctrl-space g` opens the focused pane's repo on GitHub, like `dev tmux browse` in tmux: the `browse` mod opens the current branch's PR, or in a GitButler workspace lists the applied branches (opening the only one at once). It opens URLs in the Mac's browser, also for spaces on other machines, and caches PR links per repo in `shared("browse.prs")`, so only a branch it hasn't seen waits for GitHub.

`ctrl-space t` opens `todo tui` in a dialog over 80% of the window, like `prefix t` in tmux: the `todo` mod starts it with `hc run --rm` in the focused terminal's folder, on that space's machine, since `todo` keeps one list per folder. The dialog takes the keyboard and closes when `todo` quits.

When the last pi agent in a space ends, `tabs-juan` closes the space, like quitting pi in a tmux session. A space that never had pi stays open, and spaces on a machine whose layout is not ready are left alone until it is.

`ctrl-space Z` (`tabs-juan.snooze`) snoozes the focused pi session until someone acts on its GitHub issue or PR; on the phone, the session's long-press sheet has "Snooze until activity". The session waits on the threads in its `github.*` labels, or on the open PR of the branch in its folder. A working session can't be snoozed. `dev herdr snooze` labels the session `juan.snooze=<waiter>` and starts the waiter, a child terminal on the session's machine that polls GitHub every minute with `dev github await-activity`. The Sessions list, session navigation, the attention dot, and the phone's Spaces and Notes lists leave snoozed sessions out (a space whose sessions are all snoozed hides too, unless it is active), and list them dim under Snoozed. A comment, review, push, label, state or title change, or failing checks wakes the session: the waiter clears the label and sends pi a message that links what happened. Clicking or tapping a row under Snoozed runs `dev herdr wake`, which wakes it with no message, and sending it a thread from the inbox wakes it first. The waiter ends when pi does.

`ctrl-space m` opens the `inbox` mod, a GitHub inbox in a dialog over 80% of the window. It groups the notifications by how much they need you, and for the selected one shows what happened since you last read it (GitHub's `last_read_at`). It lists every notification not marked done, read or unread, through the `is_done=false` parameter, which GitHub honours but doesn't document; read ones show dimmer. The phone's GitHub mod lists the same. Opening, commenting, replying, reviewing, reacting, merging (`m`, with the repository's default merge method and commit message) and sending to a session mark the thread read, and it stays; on the phone, opening one does. Dismissing, the only way the inbox removes a notification, marks the thread read and then done, so a thread that comes back shows only what is new. `?` lists the keys. `p` sends the notification to a session: a running agent that already handles the thread, works on the PR's branch or is in the repo, or a new session in the repo's space or wherever the repo is cloned. The session's terminal gets a `github.<owner>/<repo>#<number>` label (`hc ls --label`), so the inbox and the phone's GitHub mod show which session handles a thread, and `s` goes to it. The phone's mod imports the same `routing.js` through a symlink in the repository, and sends any notification from its sheet, and a workflow's runs, a run, a job's log or a release from the page's bar; only PRs and issues get a label. The mod imports its sibling files (`github.js` talks to GitHub through `gh`, `thread.js` splits a timeline at that moment and runs under `node --test`), and Herdr only allows that when the mod folder itself resolves into the repository, so a `.stow-fold` file makes `scripts/link-dotfiles.bash` let Stow link the folder whole.

`ctrl-space e` opens the `mail` mod, the Gmail inbox in a dialog over 80% of the window: the 50 newest threads in the inbox on the left, the selected thread as plain text on the right. `?` lists the keys. Browsing never marks mail read. `e` archives and marks read, `#` trashes and `l` adds or removes labels, with Gmail's keys: the change shows at once and comes back with an error if `gog` fails, and `z` undoes the last archive or trash. `p` sends a thread to a session as one line: Check the email "subject" from sender, with the `gog` command that reads it; new sessions start in the notes space. The GitHub inbox's `p` uses the same picker, `inbox/session-picker.js`: it lists every session as the sidebar does, moved with `j` and `k` and searched with `/`, then ways to start a new one, and the inbox starts it on the session that fits the thread best. It mirrors the order and rows of `workbench`, so change both together. A mod can only import files inside its own folder, so `scripts/link-dotfiles.bash` copies the picker into `mods/mail` and `mods/switch`.

`ctrl-space s` opens the `switch` mod, the same session picker, like `prefix s` in tmux. It opens on the focused session; `j`/`k` move, enter goes to the session, waking it first when snoozed, and Esc leaves. In every copy of the picker (switch, mail and the GitHub inbox), `/` opens a search box that fuzzy filters the sessions by name, space and machine; while it has the keyboard, the arrows, `ctrl-n`/`ctrl-p` and `ctrl-j`/`ctrl-k` move, enter picks, and Esc clears and leaves the search. Spaces without an agent are not listed. A thread opens on its newest message, one message at a time, with the history other clients copy into a reply folded into one row: `message.js` finds it from HTML quote markers, "On … wrote:" lines in several languages, Outlook-style header blocks and `>` lines, and never folds a forwarded message or a whole message. It talks to Gmail through `gog` under `zsh -c`, because only `.zshenv` sets the `GOG_*` variables that find the account and unlock its keyring, and Herdr's `exec` doesn't pass them. `message.js` turns Gmail's raw payload into text, preferring the HTML part as Gmail does: data tables become aligned columns, layout tables become paragraphs, and links show their labels and open on click. It works without `TextDecoder` or the `base64url` encoding, which the mod runtime lacks, and runs under `node --test`. The last list is kept in `shared("mail.list")` and each decoded thread in `~/.cache/herdr-mail/<id>.json` (stale when its message count or last date changes), so the dialog opens at once and then refreshes. Threads are fetched one at a time, the selected one first, because `gog` runs slower in parallel.

The `notices` block, right of the tab bar, shows the GitHub and Gmail logos with their unread counts: unread notification threads, and unread threads in the Gmail inbox. A logo is dim at zero or after a failed check, and its tooltip then shows the error. Clicking a logo opens the inbox or the mail dialog. `mods/notices/poller.js` decides when to check: GitHub as often as its `X-Poll-Interval` allows (60 s), sending the last ETag so an unchanged answer is a 304 that costs no rate limit, and Gmail every 2 minutes with one `gog gmail labels get INBOX`. Nothing is checked while the Herdr window is in the background, failures back off up to 15 minutes, and the inbox and mail mods set `shared("notices.poke")` after marking read, dismissing, archiving or trashing, so the count follows within seconds. A new source is one adapter in `mods/notices/sources.js`; its icon goes in `assets/herdr-icons/`. `node --test` in the mod folder runs its tests.

The tab bar (`tabs-juan`) shows one dot at its right end, like the `●` in the tmux status bar, while any agent in any space is blocked or finished unseen. Clicking it shows that agent, blocked ones first.
