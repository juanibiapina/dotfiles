{ fetchgit, lib, stdenv }:

stdenv.mkDerivation rec {
  pname = "qutebrowser-profile";
  version = "6b778";

  src = fetchgit {
    url = "https://github.com/jtyers/qutebrowser-profile.git";
    rev = "6b7784a81c988b1b118e8ab7512f8f9a05cc13f2";
    sha256 = "17lfb4chixf7jkmrn0la4jicppv22rpa70xsa0jq7dh5735jyp8h";
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
