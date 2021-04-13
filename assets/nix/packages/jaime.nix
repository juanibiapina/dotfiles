{ fetchFromGitHub, lib, stdenv, rustPlatform }:

rustPlatform.buildRustPackage rec {
  pname = "jaime";
  version = "0.3.0";

  src = fetchFromGitHub {
    owner = "juanibiapina";
    repo = pname;
    rev = "v${version}";
    sha256 = "0xxhkqvxbl92sfxwz8qj25rl93ndqmd3g12jwa39da4jc0nfvaiy";
  };

  cargoSha256 = "1y10c4kicgc2asxlrrmvkknlj3z563rr8fi3kbmz84d2mwiclq1m";

  meta = with lib; {
    description = "A command line launcher inspired by Alfred";
    homepage = "https://github.com/juanibiapina/jaime";
    license = licenses.mit;
    maintainers = [ { name = "Juan Ibiapina"; email = "juanibiapina@gmail.com"; } ];
  };
}
