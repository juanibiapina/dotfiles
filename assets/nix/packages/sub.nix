{ fetchFromGitHub, lib, rustPlatform }:

rustPlatform.buildRustPackage rec {
  pname = "sub";
  version = "1.1.0";

  src = fetchFromGitHub {
    owner = "juanibiapina";
    repo = pname;
    rev = "v${version}";
    sha256 = "sha256-2+jHJmiVlG+h70LIpnn5hjBd6PYAaL91jmA8VJm0LYY=";
  };

  cargoSha256 = "sha256-iHW6WiOJWBapLkJDtQzNiDAlNscnb8W03WAoEA1d6CQ=";

  meta = with lib; {
    description = "Organize groups of scripts into documented CLIs with subcommands";
    homepage = "https://github.com/juanibiapina/sub";
    license = licenses.mit;
    maintainers = [ { name = "Juan Ibiapina"; email = "juanibiapina@gmail.com"; } ];
  };
}
