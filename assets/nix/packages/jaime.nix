with import <nixpkgs> {};

rustPlatform.buildRustPackage rec {
  pname = "jaime";
  version = "0.3.0";

  src = fetchFromGitHub {
    owner = "juanibiapina";
    repo = pname;
    rev = "v${version}";
    sha256 = "0xxhkqvxbl92sfxwz8qj25rl93ndqmd3g12jwa39da4jc0nfvaiy";
  };

  cargoSha256 = "1cq2qnchqwbmjm9jndffkibmjbrbvj4kl27m3fqabcbdxjv1x5mz";

  meta = with lib; {
    description = "A command line launcher inspired by Alfred";
    homepage = "https://github.com/juanibiapina/jaime";
    license = licenses.mit;
    maintainers = [ { name = "Juan Ibiapina"; email = "juanibiapina@gmail.com"; } ];
  };
}
