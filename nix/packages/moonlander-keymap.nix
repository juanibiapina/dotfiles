{ pkgs, qmkSrc, keymap }:

pkgs.runCommand "moonlander-keymap" {
  nativeBuildInputs = [ pkgs.qmk pkgs.keymap-drawer pkgs.yq-go ];
} ''
  export HOME="$TMPDIR"
  export QMK_HOME=${qmkSrc}

  qmk c2json -kb zsa/moonlander/reva -km juan --no-cpp ${keymap}/keymap.c > keymap.json

  keymap dump-config > defaults.yaml
  yq eval-all '. as $item ireduce ({}; . * $item)' defaults.yaml ${keymap}/keymap-drawer.yaml > config.yaml

  keymap -c config.yaml parse -q keymap.json -l Base Symbols Media > parsed.yaml
  yq --from-file ${keymap}/keymap-drawer-types.yq parsed.yaml > keymap.yaml

  mkdir -p $out
  keymap -c config.yaml draw \
    -j ${qmkSrc}/keyboards/zsa/moonlander/reva/keyboard.json \
    -l LAYOUT_moonlander \
    keymap.yaml > $out/moonlander.svg
''
