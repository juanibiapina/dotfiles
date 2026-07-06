{ pkgs, inputs, ... }:

let
  deltoids = pkgs.rustPlatform.buildRustPackage {
    pname = "deltoids";
    version = (pkgs.lib.importTOML "${inputs.deltoids}/Cargo.toml").workspace.package.version;

    src = inputs.deltoids;

    cargoHash = "sha256-Ii3DkCJtbATkcxwvAUfz7wUhy5wajSIKr4WpYH2zPz0=";

    cargoBuildFlags = [ "-p" "deltoids-cli" ];

    # git2 -> libgit2-sys / libssh2-sys / openssl-sys need system libs
    nativeBuildInputs = [ pkgs.pkg-config ];
    buildInputs = [ pkgs.openssl pkgs.zlib ];

    # Tests touch the filesystem and aren't needed for packaging
    doCheck = false;

    meta = with pkgs.lib; {
      description = "Tools for reviewing code in the agentic era (deltoids with pager, review, edit, write, traces subcommands)";
      homepage = "https://github.com/juanibiapina/deltoids";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  environment.systemPackages = [ deltoids ];
}
