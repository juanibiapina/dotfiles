{ inputs, pkgs, ... }:

let
  # Powerbar imports two sibling packages as libraries at runtime: it calls
  # getSetting from @juanibiapina/pi-extension-settings, and its manifest loads
  # @juanibiapina/pi-usage via node_modules/@juanibiapina/pi-usage/index.ts. pi
  # does not run `npm install` for local packages, so we assemble a package dir
  # that already has those two under node_modules, symlinked from their own
  # pinned flake inputs. Both export TypeScript source (jiti runs it at runtime)
  # and have no third-party runtime deps of their own, so no npm build or
  # dependency fetch is needed. Bump powerbar and its libs together via
  # `nix flake update pi-powerbar pi-extension-settings pi-usage`.
  pi-powerbar = pkgs.runCommand "pi-powerbar-${(pkgs.lib.importJSON "${inputs.pi-powerbar}/package.json").version}" { } ''
    mkdir -p $out
    cp -r ${inputs.pi-powerbar}/. $out/
    chmod -R u+w $out
    mkdir -p $out/node_modules/@juanibiapina
    ln -s ${inputs.pi-extension-settings} $out/node_modules/@juanibiapina/pi-extension-settings
    ln -s ${inputs.pi-usage} $out/node_modules/@juanibiapina/pi-usage
  '';
in
{
  # Deploy the personal pi packages from flake inputs pinned by flake.lock, so
  # `gob run make` installs each at the exact rev in the lock file. settings.json
  # references these by ~/.pi/agent/pi-packages/<name>. Bump with
  # `nix flake update <input>` then `gob run make`.
  home.file.".pi/agent/pi-packages/pi-gob".source = inputs.pi-gob;
  home.file.".pi/agent/pi-packages/pi-extension-settings".source = inputs.pi-extension-settings;
  home.file.".pi/agent/pi-packages/pi-tokyonight".source = inputs.pi-tokyonight;
  home.file.".pi/agent/pi-packages/pi-powerbar".source = pi-powerbar;
}
