{ pkgs, inputs, ... }:

let
  deltoids = pkgs.rustPlatform.buildRustPackage {
    pname = "deltoids";
    version = "0.4.0";

    src = inputs.deltoids;

    cargoLock = {
      lockFile = "${inputs.deltoids}/Cargo.lock";
    };

    cargoBuildFlags = [ "-p" "deltoids-cli" "-p" "edit-cli" ];

    # git2 -> libgit2-sys / libssh2-sys / openssl-sys need system libs
    nativeBuildInputs = [ pkgs.pkg-config ];
    buildInputs = [ pkgs.openssl pkgs.zlib ];

    # Tests touch the filesystem and aren't needed for packaging
    doCheck = false;

    meta = with pkgs.lib; {
      description = "Tools for reviewing code in the agentic era (deltoids, edit, write, edit-tui)";
      homepage = "https://github.com/juanibiapina/deltoids";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  environment.systemPackages = [ deltoids ];
}
