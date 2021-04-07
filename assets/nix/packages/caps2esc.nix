{ cmake, fetchFromGitHub, stdenv }:

stdenv.mkDerivation rec {
  pname = "caps2esc";
  version = "1.0.0";

  nativeBuildInputs = [ cmake ];

  src = fetchFromGitHub {
    owner = "juanibiapina";
    repo = pname;
    rev = "v${version}";
    sha256 = "0bbcb8w21dbqbm2v11phrmpsvaa59gv7gd49gfmcvn1v0m35y9gc";
  };
}
