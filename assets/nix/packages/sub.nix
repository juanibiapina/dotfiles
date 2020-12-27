with import <nixpkgs> {};

rustPlatform.buildRustPackage rec {
  pname = "sub";
  version = "0.6.0";

  src = fetchFromGitHub {
    owner = "juanibiapina";
    repo = pname;
    rev = "v${version}";
    sha256 = "194dznlqfv2fql0ds96fcr0d8lxls70jghfbdn4sii7i71n3ax8n";
  };

  cargoSha256 = "1i7lhr05dccd6pyrs0yxwiival5ghm58qdz68g0kfa7x0735ly6i";

  meta = with stdenv.lib; {
    description = "Organize groups of scripts into documented CLIs with subcommands";
    homepage = "https://github.com/juanibiapina/sub";
    license = licenses.mit;
    maintainers = [ { name = "Juan Ibiapina"; email = "juanibiapina@gmail.com"; } ];
  };
}
