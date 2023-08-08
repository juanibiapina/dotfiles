{
  pkgs ? import <nixpkgs> {},
}:

pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    ruby
    ranger
    vim-full
  ];
  shellHook = ''
    # install gems locally
    mkdir -p .local/nix-gems
    export GEM_HOME=$PWD/.local/nix-gems
    export GEM_PATH=$GEM_HOME
    export PATH=$GEM_HOME/bin:$PATH

    # add local bin directory to path
    export PATH=$PWD/bin:$PATH
  '';
}
