{ fetchgit, lib, stdenv }:

stdenv.mkDerivation rec {
  pname = "qutebrowser-profile";
  version = "1.0.0";

  src = fetchgit {
    url = "https://github.com/juanibiapina/qutebrowser-profile.git";
    rev = "701bcbe83b6e90d19f7e4e5bf4e7ea81b28aedc0";
    sha256 = "0p1c7ykcc14j7b0nifqbh2x2xqxswv77m2i65j42ynxg3r7hr3m4";
  };

  installPhase = ''
    mkdir -p $out/bin
    cp qutebrowser-profile $out/bin
  '';

  meta = with lib; {
    description = "Ability to run qutebrowser with different profiles, choose a profile via dmenu/rofi interactively for new links";
    homepage = "https://github.com/jtyers/qutebrowser-profile";
    license = licenses.mit;
    maintainers = [ { name = "Juan Ibiapina"; email = "juanibiapina@gmail.com"; } ];
  };
}
