{ lib, stdenv, fetchurl, mfcj4420dwlpr, makeWrapper}:

stdenv.mkDerivation rec {
  pname = "mfcj4420dw-cupswrapper";
  version = "3.0.1-1";

  src = fetchurl {
    url = "https://download.brother.com/welcome/dlf101149/brother_mfcj4420dw_GPL_source_${version}.tar.gz";
    sha256 = "08aa7xclviy87y3v0kfxz3byxgp0b8kw2f1b6smlfm03b22vk4a7";
  };

  nativeBuildInputs = [ makeWrapper ];
  buildInputs = [ mfcj4420dwlpr ];

  patchPhase = ''
    WRAPPER=cupswrapper/cupswrappermfcj4420dw

    substituteInPlace $WRAPPER \
    --replace /opt "${mfcj4420dwlpr}/opt" \
    --replace /usr "${mfcj4420dwlpr}/usr" \
    --replace /etc "$out/etc"

    substituteInPlace $WRAPPER \
    --replace "\`cp " "\`cp -p " \
    --replace "\`mv " "\`cp -p "
    '';

  buildPhase = ''
    cd brcupsconfig
    make all
    cd ..
    '';

  installPhase = ''
    TARGETFOLDER=$out/opt/brother/Printers/mfcj4420dw/cupswrapper/
    mkdir -p $out/opt/brother/Printers/mfcj4420dw/cupswrapper/

    cp brcupsconfig/brcupsconfig $TARGETFOLDER
    cp cupswrapper/cupswrappermfcj4420dw $TARGETFOLDER/
    cp ppd/brother_mfcj4420dw_printer_en.ppd $TARGETFOLDER/
    '';

  cleanPhase = ''
    cd brcupsconfig
    make clean
    '';

  meta = {
    homepage = "http://www.brother.com/";
    description = "Brother MFC-J4420DW CUPS wrapper driver";
    license = lib.licenses.gpl2;
    platforms = lib.platforms.linux;
    downloadPage = "https://support.brother.com/g/b/downloadlist.aspx?c=us&lang=en&prod=mfcj4420dw_us_eu&os=128";
  };
}
