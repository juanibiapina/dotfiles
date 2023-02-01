{ fetchFromGitHub, lib, stdenv, rustPlatform, openssl, pkg-config }:

rustPlatform.buildRustPackage rec {
  pname = "antr";
  version = "1.0.1";

  src = fetchFromGitHub {
    owner = "juanibiapina";
    repo = pname;
    rev = "v${version}";
    sha256 = "sha256-fqKCaSzQFbvO3uMpP5HUZ9gGPGyZht96efyeLPEB+ro=";
  };

  nativeBuildInputs = [ openssl pkg-config ];
  buildInputs = [ openssl ];

  cargoSha256 = "sha256-az9IKJhZQNst/4URXqZipmtyFejWbHhv+5bVY5kRwwY=";

  meta = with lib; {
    description = "A simple to use file system event watcher that runs arbitrary commands";
    homepage = "https://github.com/juanibiapina/antr";
    license = licenses.mit;
    maintainers = [ { name = "Juan Ibiapina"; email = "juanibiapina@gmail.com"; } ];
  };
}
