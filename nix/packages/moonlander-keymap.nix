{ pkgs, qmkSrc, keymap, drawing }:

let
  layers = [ "Base" "Symbols" "Media" "Windows" ];
in
pkgs.runCommand "moonlander-keymap" {
  nativeBuildInputs = [ pkgs.qmk pkgs.keymap-drawer pkgs.yq-go pkgs.jq ];
} ''
  export HOME="$TMPDIR"
  export QMK_HOME=${qmkSrc}

  qmk c2json -kb zsa/moonlander/reva -km juan --no-cpp ${keymap}/keymap.c > keymap.json

  keymap dump-config > defaults.yaml
  yq eval-all '. as $item ireduce ({}; . * $item)' defaults.yaml ${drawing}/keymap-drawer.yaml > config.yaml

  keymap -c config.yaml parse -q keymap.json -l ${pkgs.lib.concatStringsSep " " layers} > parsed.yaml
  yq --from-file ${drawing}/keymap-drawer-types.yq parsed.yaml > keymap.yaml

  mkdir -p $out

  jq -n \
    --argjson layers ${pkgs.lib.escapeShellArg (builtins.toJSON layers)} \
    --slurpfile keymap keymap.json \
    --slurpfile keyboard ${qmkSrc}/keyboards/zsa/moonlander/reva/keyboard.json \
    '{
      layers: $layers,
      keys: [
        $keyboard[0].layouts.LAYOUT.layout | to_entries[] | .key as $i | {
          index: $i,
          row: .value.matrix[0],
          col: .value.matrix[1],
          x: .value.x,
          y: .value.y,
          keycodes: [ $keymap[0].layers[] | .[$i] ]
        }
      ]
    }' > $out/layout.json
  keymap -c config.yaml draw \
    -j ${qmkSrc}/keyboards/zsa/moonlander/reva/keyboard.json \
    -l LAYOUT_moonlander \
    keymap.yaml > $out/moonlander.svg

  {
    cat ${drawing}/editor.html
    sed '/^<?xml/d' $out/moonlander.svg
    printf '</div>\n<script>\nconst KEYMAP = '
    cat keymap.json
    printf ';\n</script>\n<script>\n'
    cat ${drawing}/editor.js
    printf '</script>\n</body>\n</html>\n'
  } > $out/moonlander.html
''
