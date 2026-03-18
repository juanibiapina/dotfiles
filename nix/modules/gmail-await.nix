{ pkgs, inputs, ... }:

let
  gmail-await = pkgs.stdenv.mkDerivation {
    pname = "gmail-await";
    version = "0.1.0";

    src = inputs.gmail-await;

    installPhase = ''
      install -Dm755 gmail-await $out/bin/gmail-await
    '';

    meta = with pkgs.lib; {
      description = "Poll Gmail inbox until a new email arrives";
      homepage = "https://github.com/juanibiapina/gmail-await";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  environment.systemPackages = [ gmail-await ];
}
