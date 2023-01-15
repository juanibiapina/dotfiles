{ fetchFromGitHub, lib, stdenv, rustPlatform }:

rustPlatform.buildRustPackage rec {
  pname = "sub";
  version = "0.8.1";

  src = fetchFromGitHub {
    owner = "juanibiapina";
    repo = pname;
    rev = "v${version}";
    sha256 = "sha256-+3lye76+VLc32oGjR/p5BX6oLUxz5hB6eid8q8GSllk=";
  };

  cargoSha256 = "sha256-0JXNOyApQmEX7PI5gMEDJc0bwlQLV+spa47PoUlv/kg=";

  meta = with lib; {
    description = "Organize groups of scripts into documented CLIs with subcommands";
    homepage = "https://github.com/juanibiapina/sub";
    license = licenses.mit;
    maintainers = [ { name = "Juan Ibiapina"; email = "juanibiapina@gmail.com"; } ];
  };
}
