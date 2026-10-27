# Set up a new Mac

This procedure adds a Mac to the repository and sets it up. You work on two machines: the new Mac, and an existing host that can decrypt the secrets (for example `macm1`). Replace `<host>` with the hostname of the new Mac.

## 1. Add the host to the repository

Do these steps on the existing host.

1. Create `nix/hosts/<host>/configuration.nix` and `nix/hosts/<host>/home-manager.nix`. Copy them from `nix/hosts/macm1/` for a personal Mac or from `nix/hosts/mb5p/` for a work Mac.
2. Add a `darwinConfigurations."<host>"` entry to `flake.nix`.
3. Copy `.github/workflows/macm1.yml` to `.github/workflows/<host>.yml` and replace `macm1` with `<host>`.
4. Add the host to the "Hosts" list in `README.md`.
5. Generate a Syncthing identity. The command prints the device ID:

   ```bash
   syncthing_dir=$(mktemp -d)
   syncthing generate --home="$syncthing_dir"
   ```

6. Add `<host>-syncthing-cert.age` and `<host>-syncthing-key.age` to `nix/secrets/secrets.nix`. Encrypt `$syncthing_dir/cert.pem` and `$syncthing_dir/key.pem` into them. [secrets.md](secrets.md) describes the recipients and the encryption.
7. Delete `$syncthing_dir`.
8. Add the device ID to `nix/modules/syncthing.nix`, and add the host to each folder that it syncs.
9. If the host must not sync a folder, set `services.syncthing.settings.folders.<name>.enable = false` in its `home-manager.nix`.
10. Commit and push.

## 2. Install the base system

Do these steps on the new Mac.

1. If you want to do the next steps over SSH from the existing host, turn on System Settings > General > Sharing > Remote Login. Then run:

   ```bash
   mkdir -p ~/.ssh
   curl -fsSL https://github.com/juanibiapina.keys >> ~/.ssh/authorized_keys
   echo 'juan ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/juan-bootstrap
   ```

2. Install Homebrew. The installer also installs the Xcode Command Line Tools:

   ```bash
   NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. Install Nix:

   ```bash
   sh <(curl --proto '=https' --tlsv1.2 -L https://nixos.org/nix/install) --daemon --yes
   ```

4. Clone the repository:

   ```bash
   git clone https://github.com/juanibiapina/dotfiles.git ~/workspace/juanibiapina/dotfiles
   ```

5. Move the shell files that nix-darwin replaces. nix-darwin stops if they exist:

   ```bash
   for f in /etc/zshrc /etc/bashrc /etc/zprofile; do sudo mv "$f" "$f.before-nix-darwin"; done
   ```

6. Run nix-darwin for the first time. The hostname is not `<host>` yet, so name the configuration:

   ```bash
   cd ~/workspace/juanibiapina/dotfiles
   sudo nix --extra-experimental-features 'nix-command flakes' run nix-darwin/master#darwin-rebuild -- switch --flake .#<host>
   ```

7. Link the dotfiles with `./scripts/link-dotfiles.bash`.
8. Open a new terminal and run `make` in the repository.
9. Install the GitButler skill: `but skill install --path ~/.agents/skills/gitbutler`.
10. Set the login shell: `chsh -s /run/current-system/sw/bin/zsh`.
11. If you created `/etc/sudoers.d/juan-bootstrap`, delete it. nix-darwin now installs its own sudo rule.

## 3. Add the keys and secrets

1. On the new Mac, create the user SSH key with `dev secrets generate-ssh-key`.
2. On the new Mac, make sure that `/etc/ssh/ssh_host_ed25519_key.pub` exists. Remote Login creates it.
3. On the existing host, add both public keys to `nix/modules/ssh-keys.nix` and re-encrypt the secrets of the host. [secrets.md](secrets.md) describes both steps. Commit and push.
4. On the new Mac, pull and run `make`.
5. On the new Mac, restart Syncthing. Before step 4, it did not have its identity and generated a temporary one:

   ```bash
   launchctl kickstart -k gui/$(id -u)/org.nix-community.home.syncthing
   ```

6. On each other host, pull and rebuild. The rebuild adds the new keys to `authorized_keys` and the new device to Syncthing.
7. If Syncthing on a Mac does not list the new device after the rebuild, run `launchctl kickstart -k gui/$(id -u)/org.nix-community.home.syncthing-init`. The init job fails when it runs before Syncthing accepts connections.
8. Unlock git-crypt. Run this on the existing host. `git-crypt unlock` needs a clean working tree on the new Mac:

   ```bash
   git-crypt export-key /dev/stdout | ssh <host> 'cd ~/workspace/juanibiapina/dotfiles && k=$(mktemp) && cat > "$k" && git-crypt unlock "$k"; rm -f "$k"'
   ```

9. Import the GPG key. On a personal Mac that syncs `~/Sync/secrets`, run `dev secrets import-master-key`. On a work Mac, run this on the existing host:

   ```bash
   gpg --export --armor 25CF925BEFF168CA3B21FA215DC9214C4F52F198 | ssh <host> gpg --batch --import
   gpg --export-secret-keys --armor 25CF925BEFF168CA3B21FA215DC9214C4F52F198 | ssh <host> gpg --batch --import
   ```

## 4. Sign in to accounts

1. Run `gh auth login -h github.com -p ssh -w` on the new Mac. When it asks, upload `~/.ssh/id_ed25519.pub`.
2. If the upload did not happen, run `gh auth refresh -h github.com -s admin:public_key`, then `gh ssh-key add ~/.ssh/id_ed25519.pub --title <host>`.
3. Open Tailscale and log in. If it shows the old computer name, quit and open it again.
4. Open Firefox and sign in to Firefox Sync. Sync brings the extensions, bookmarks, and logins.
5. In the KeePassXC-Browser extension, click Connect and name the connection.
6. When macOS asks to make Firefox Developer Edition the default browser, accept.

Over SSH, `gh` cannot read its token from the keychain. To run `gh` from an SSH session, start it in the desktop session: `sudo launchctl asuser $(id -u) sudo -u $USER gh <args>`.

## 5. Set up apps and permissions

1. Install Rust with the rustup installer. `.zshenv` already adds `~/.cargo/bin` to `PATH`:

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
   rm -rf ~/.cache/zsh
   ```

   The second command clears the cached `mise activate` output. That cache holds the full `PATH` from before `~/.cargo` existed.
2. Open AeroSpace once. Approve its Accessibility request. AeroSpace then adds itself as a login item.
3. Give pi Full Disk Access. macOS does not ask. It denies the access without a message.
   1. Print the launcher path with `readlink -f "$(command -v pi)"`.
   2. Open System Settings > Privacy & Security > Full Disk Access and click +.
   3. Click the file list, press Cmd+Shift+G, paste the path, and select `pi`.
   4. Restart pi.
4. Copy the local Firefox preferences from an existing Mac. Firefox Sync does not sync them. Close Firefox on the new Mac, then copy these lines from the `prefs.js` of the existing profile into the new `prefs.js`: `sidebar.verticalTabs`, `sidebar.visibility`, `sidebar.main.tools`, `browser.toolbars.bookmarks.visibility`, `browser.bookmarks.defaultLocation`, `browser.uiCustomization.state`, `browser.uiCustomization.horizontalTabstrip`, `layout.css.prefers-color-scheme.content-override`, `browser.translations.neverTranslateLanguages`, `browser.ml.chat.provider`, `devtools.toolbox.host`, `browser.aboutConfig.showWarning`.
5. Pin the same tabs in Firefox. Firefox keeps pinned tabs in the session file `sessionstore.jsonlz4`.
6. Close KeePassXC. In `~/Library/Application Support/KeePassXC/keepassxc.ini`, set these values:

   ```ini
   [Browser]
   AlwaysAllowAccess=true
   AlwaysAllowUpdate=false
   UnlockDatabase=false

   [PasswordGenerator]
   Length=24

   [Security]
   LockDatabaseIdle=false
   LockDatabaseScreenLock=false
   ```

7. Set the wallpaper in System Settings > Wallpaper. `macm1` uses an Aerial wallpaper.

## 6. Copy personal data

1. Copy `~/.zsh_history` from the existing host.
2. Clone the active repositories into `~/workspace/<owner>/<repo>`.
3. To move a branch that is not on a remote, run this in the repository on the existing host:

   ```bash
   git push <host>:workspace/<owner>/<repo> refs/heads/<branch>:refs/heads/<branch>
   ```

## 7. Finish

Log out and log in again.
