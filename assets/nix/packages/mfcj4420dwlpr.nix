{ lib, stdenv, fetchurl, cups, dpkg, ghostscript, a2ps, coreutils, gnused, gawk, file, makeWrapper }:

stdenv.mkDerivation rec {
  pname = "mfcj4420dw-cupswrapper";
  version = "3.0.1-1";

  src = fetchurl {
    url = "https://download.brother.com/welcome/dlf101144/mfcj4420dwlpr-${version}.i386.deb";
    sha256 = "0idsxanmy67pvfllw1i7ji12swki9l830w5wg8lxjkp08154y11h";
  };

  nativeBuildInputs = [ makeWrapper ];
  buildInputs = [ cups ghostscript dpkg a2ps ];

  dontUnpack = true;

  installPhase = ''
    dpkg-deb -x $src $out

    substituteInPlace $out/opt/brother/Printers/mfcj4420dw/lpd/filtermfcj4420dw \
    --replace /opt "$out/opt" \

    sed -i '/GHOST_SCRIPT=/c\GHOST_SCRIPT=gs' $out/opt/brother/Printers/mfcj4420dw/lpd/psconvertij2

    patchelf --set-interpreter ${stdenv.glibc.out}/lib/ld-linux.so.2 $out/opt/brother/Printers/mfcj4420dw/lpd/brmfcj4420dwfilter

    mkdir -p $out/lib/cups/filter/
    ln -s $out/opt/brother/Printers/mfcj4420dw/lpd/filtermfcj4420dw $out/lib/cups/filter/brother_lpdwrapper_mfcj4420dw

    wrapProgram $out/opt/brother/Printers/mfcj4420dw/lpd/psconvertij2 \
    --prefix PATH ":" ${ lib.makeBinPath [ gnused coreutils gawk ] }

    wrapProgram $out/opt/brother/Printers/mfcj4420dw/lpd/filtermfcj4420dw \
    --prefix PATH ":" ${ lib.makeBinPath [ ghostscript a2ps file gnused coreutils ] }
    '';

  meta = {
    homepage = "http://www.brother.com/";
    description = "Brother MFC-J4420DW LPR driver";
    license = lib.licenses.unfree;
    platforms = lib.platforms.linux;
    downloadPage = "http://support.brother.com/g/b/downloadlist.aspx?c=us&lang=en&prod=mfcj4420dw_us_eu&os=128";
  };
}
