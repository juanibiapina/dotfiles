{ config, pkgs, ... }:

let
  appId = "2891952";
  installationId = "176035568";
  keyPath = "${config.xdg.configHome}/zerocoding-app/private-key.pem";

  token = pkgs.writeShellApplication {
    name = "zerocoding-token";
    runtimeInputs = [ pkgs.openssl pkgs.curl pkgs.jq pkgs.coreutils ];
    text = ''
      if [ "''${1:-}" = "--git-credential" ]; then
        [ "''${2:-}" = "get" ] || exit 0
        cat >/dev/null
        printf 'username=x-access-token\npassword=%s\n' "$("$0")"
        exit 0
      fi

      cache_dir="''${XDG_RUNTIME_DIR:-/tmp}/zerocoding-app"
      cache="$cache_dir/token"
      now="$(date +%s)"

      if [ -f "$cache" ]; then
        read -r cached_token cached_expiry <"$cache"
        if [ "$((cached_expiry - 300))" -gt "$now" ]; then
          printf '%s\n' "$cached_token"
          exit 0
        fi
      fi

      b64() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
      header="$(printf '{"alg":"RS256","typ":"JWT"}' | b64)"
      payload="$(printf '{"iat":%d,"exp":%d,"iss":"%s"}' "$((now - 60))" "$((now + 540))" "${appId}" | b64)"
      signature="$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -sign "${keyPath}" -binary | b64)"

      response="$(curl -fsS -X POST \
        -H "Authorization: Bearer $header.$payload.$signature" \
        -H "Accept: application/vnd.github+json" \
        "https://api.github.com/app/installations/${installationId}/access_tokens")"
      new_token="$(jq -r .token <<<"$response")"
      expiry="$(date -d "$(jq -r .expires_at <<<"$response")" +%s)"

      [ -d "$cache_dir" ] || mkdir -m 700 "$cache_dir"
      (umask 077 && printf '%s %s\n' "$new_token" "$expiry" >"$cache.tmp")
      mv "$cache.tmp" "$cache"
      printf '%s\n' "$new_token"
    '';
  };
in
{
  age.secrets.zerocoding-app-key = {
    file = ../../secrets/zerocoding-app-key.age;
    path = keyPath;
    mode = "600";
    symlink = false;
  };

  home.packages = [ token ];

  xdg.configFile."zerocoding-app/bin/gh" = {
    executable = true;
    text = ''
      #!${pkgs.runtimeShell}
      GH_TOKEN="$(${token}/bin/zerocoding-token)" exec ${config.programs.gh.package}/bin/gh "$@"
    '';
  };
}
