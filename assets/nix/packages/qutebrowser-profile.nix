{ fetchgit, lib, stdenv }:

stdenv.mkDerivation rec {
  pname = "qutebrowser-profile";
  version = "1c14e";

  src = fetchgit {
    url = "https://github.com/juanibiapina/qutebrowser-profile.git";
    rev = "1c14e97cf9ce1c6ad3825282b94c111353ffda47";
    sha256 = "0dsnm44lh1jp30yzh0kklk0mg7wag9cc09f84x1jz59c2hjv0cfj";
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
