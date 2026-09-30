# Mini updater removed the shell secret during a failed pull

The updater lacked `git-crypt` on its service `PATH`. Git removed the previous
working file before the replacement's decryption filter failed.

On 2026-09-29 at 04:00, `dotfiles-autoupdate.service` attempted to advance
`eaed4d68` to `e006eb63`. Its journal recorded `git-crypt: command not found`,
followed by `secrets/zshrc.secret: smudge filter git-crypt failed` and exit 128.
The checkout subsequently reported the tracked file as deleted.

The dependency list in `nix/hosts/mini/modules/dotfiles-autoupdate.nix` omitted
`git-crypt`. It also omitted Bash, which `scripts/link-dotfiles.bash` requires.

An isolated Git checkout reproduced removal of an existing file under the
running service's exact `PATH`. Adding `git-crypt` and Bash to that `PATH`
allowed the same checkout to decrypt and write a replacement successfully.
The fixture contained generated test text and did not change the live checkout.

Both packages are now explicit service dependencies. The user restored the
secret and pulled the checkout to `bc6d9cbc`; the running unit retains its old
`PATH` until a corrected system generation is activated.
