# tmux built from the side-status pull request branch.
#
# Why: tmux/tmux#5468 adds a vertical status line that can show windows,
# sessions and custom formats beside every window. flake.lock pins the exact
# tested revision from the contributor branch.
#
# Caveat: this is unreleased development code from a third-party branch. Roll
# back by reverting the tmux-src pin in flake.lock.
#
# Update with: nix flake update tmux-src
#
# After updating, run `dev tmux theme-check`. The theme palette block in
# dotfiles/tmux/.tmux.conf pins every one of tmux's dark-theme-* colours, and a
# colour added upstream would silently fall back to tmux's own value.
{ pkgs, src }:

let
  inherit (pkgs) lib stdenv;

  # flake inputs expose lastModifiedDate as "YYYYMMDDHHMMSS".
  d = src.lastModifiedDate;
  date = "${builtins.substring 0 4 d}-${builtins.substring 4 2 d}-${builtins.substring 6 2 d}";

  # Derive both versions from AC_INIT so a new upstream development line does
  # not require a second hardcoded update here.
  configureLines = lib.splitString "\n" (builtins.readFile "${src}/configure.ac");
  versionPrefix = "AC_INIT([tmux], ";
  versionLine = lib.findFirst
    (line: lib.hasPrefix versionPrefix line)
    (throw "tmux configure.ac does not contain ${versionPrefix}")
    configureLines;
  upstreamVersion = lib.removeSuffix ")" (lib.removePrefix versionPrefix versionLine);
  releaseLine = lib.removePrefix "next-" upstreamVersion;
in
pkgs.tmux.overrideAttrs (old: {
  version = "${releaseLine}-unstable-${date}";

  inherit src;

  # Mandatory on darwin, not an optimisation: since commit a10ed323 ("Require
  # jemalloc on macOS") configure.ac:1036 aborts with "must give
  # --enable-jemalloc or --disable-jemalloc" unless one is chosen, because macOS
  # calloc(3) does not always zero allocations (issue 5385). Passing the flag
  # explicitly rather than relying on pkg-config autodetection means a missing
  # jemalloc fails the build loudly instead of silently changing the allocator.
  buildInputs = old.buildInputs ++ lib.optionals stdenv.hostPlatform.isDarwin [
    pkgs.jemalloc
  ];

  configureFlags = old.configureFlags ++ lib.optionals stdenv.hostPlatform.isDarwin [
    "--enable-jemalloc"
  ];

  # nixpkgs' versionCheckHook greps `tmux -V` for `version`, which no longer
  # matches now that version encodes the snapshot date. Assert the upstream
  # string instead, so the check still catches a binary that will not run.
  doInstallCheck = false;
  postInstall = (old.postInstall or "") + ''
    actual=$("$out/bin/tmux" -V)
    if [ "$actual" != "tmux ${upstreamVersion}" ]; then
      echo "expected 'tmux ${upstreamVersion}' from tmux -V, got '$actual'" >&2
      echo "upstream probably bumped AC_INIT; update upstreamVersion here" >&2
      exit 1
    fi
  '';

  meta = old.meta // {
    changelog = "https://github.com/tmux/tmux/raw/master/CHANGES";
  };
})
