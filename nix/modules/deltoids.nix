{ pkgs, inputs, lib, ... }:

let
  deltoids = pkgs.rustPlatform.buildRustPackage {
    pname = "deltoids";
    version = (pkgs.lib.importTOML "${inputs.deltoids}/Cargo.toml").workspace.package.version;

    src = inputs.deltoids;

    cargoHash = "sha256-fMOl1CNBXUliK6QMDrZoNfwTdDKF2EuHQNJSWbQFxyo=";

    cargoBuildFlags = [ "-p" "deltoids-cli" ];

    # git2 -> libgit2-sys / libssh2-sys / openssl-sys need system libs
    nativeBuildInputs = [ pkgs.pkg-config ];
    buildInputs = [ pkgs.openssl pkgs.zlib ];

    # Tests touch the filesystem and aren't needed for packaging
    doCheck = false;

    meta = with pkgs.lib; {
      description = "Diff pager and scrolling TUI with scope-expanded hunks";
      homepage = "https://github.com/juanibiapina/deltoids";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  options.packages.deltoids = lib.mkOption {
    type = lib.types.package;
    default = deltoids;
    readOnly = true;
    description = "The deltoids package";
  };

  config.environment.systemPackages = [ deltoids ];
}
