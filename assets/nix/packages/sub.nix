{ fetchFromGitHub, lib, stdenv, rustPlatform }:

rustPlatform.buildRustPackage rec {
  pname = "sub";
  version = "0.7.0";

  src = fetchFromGitHub {
    owner = "juanibiapina";
    repo = pname;
    rev = "v${version}";
    sha256 = "03qxix1zsrkh1dka3n1n2vkp2cxy3mqgwb3pfs4zj67j1jmah89q";
  };

  cargoSha256 = "157vsp0id4hycgbifgmx744pvczqcv2gvbhaapr7dp1xgp3vwncr";

  meta = with lib; {
    description = "Organize groups of scripts into documented CLIs with subcommands";
    homepage = "https://github.com/juanibiapina/sub";
    license = licenses.mit;
    maintainers = [ { name = "Juan Ibiapina"; email = "juanibiapina@gmail.com"; } ];
  };
}
