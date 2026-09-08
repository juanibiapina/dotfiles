{ pkgs, inputs, lib, ... }:

let
  # greprip provides `grg` and `fnd`: drop-in translators that accept POSIX
  # grep/find syntax and exec ripgrep/fd instead. pi wires them via
  # shellCommandPrefix (see dotfiles/pi/.pi/agent/settings.json) so the agent's
  # grep/find habits map to the faster tools with correct flags. Notably grg
  # drops grep-only flags that are rg defaults (-r, -R, -E), which fixes the
  # `grep -rn` / `rg -rn` class of bug. Bump with `nix flake update greprip`.
  greprip = pkgs.rustPlatform.buildRustPackage {
    pname = "greprip";
    version = (pkgs.lib.importTOML "${inputs.greprip}/Cargo.toml").package.version;

    src = inputs.greprip;

    cargoLock.lockFile = "${inputs.greprip}/Cargo.lock";

    # Tests shell out to rg/fd and touch the filesystem; not needed for packaging.
    doCheck = false;

    # grg/fnd exec rg/fd at runtime, so guarantee both are on PATH regardless of
    # the caller's environment.
    nativeBuildInputs = [ pkgs.makeWrapper ];
    postInstall = ''
      for bin in grg fnd; do
        wrapProgram $out/bin/$bin \
          --prefix PATH : ${lib.makeBinPath [ pkgs.ripgrep pkgs.fd ]}
      done
    '';

    meta = with pkgs.lib; {
      description = "Transparent grep/find to rg/fd translators for coding agents (grg, fnd)";
      homepage = "https://github.com/kaofelix/greprip-rs";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  options.packages.greprip = lib.mkOption {
    type = lib.types.package;
    default = greprip;
    readOnly = true;
    description = "The greprip package (grg, fnd)";
  };

  config.environment.systemPackages = [ greprip ];
}
