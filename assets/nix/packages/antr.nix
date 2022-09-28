{ fetchFromGitHub, lib, stdenv, rustPlatform, openssl, pkg-config }:

rustPlatform.buildRustPackage rec {
  pname = "antr";
  version = "1.0.0";

  src = fetchFromGitHub {
    owner = "juanibiapina";
    repo = pname;
    rev = "v${version}";
    sha256 = "sha256-PCmSFikkkyPRmjk6kwvNPzn4wtOBIru8L6L66xu4Msc=";
  };

  nativeBuildInputs = [ openssl pkg-config ];
  buildInputs = [ openssl ];

  cargoSha256 = "sha256-mFqgTXgFG6wooZ7JEcvB/TQ+XnJ/xYJPTNMeYUIXjS4=";

  meta = with lib; {
    description = "A simple to use file system event watcher that runs arbitrary commands";
    homepage = "https://github.com/juanibiapina/antr";
    license = licenses.mit;
    maintainers = [ { name = "Juan Ibiapina"; email = "juanibiapina@gmail.com"; } ];
  };
}
