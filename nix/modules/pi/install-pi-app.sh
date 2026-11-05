# Usage: install-pi-app <Pi.app>
#
# Installs a copy of <Pi.app> at ~/.local/share/pi-launcher/Pi.app, signed with
# the "Pi Launcher" certificate from the login keychain. The certificate is
# created on first use. macOS privacy grants follow the bundle id and this
# certificate, so they survive every rebuild of the launcher.

set -euo pipefail

source_app=$1
install_dir="$HOME/.local/share/pi-launcher"
installed_app="$install_dir/Pi.app"
stamp="$install_dir/source"
keychain="${PI_APP_KEYCHAIN:-$HOME/Library/Keychains/login.keychain-db}"
cert_name="Pi Launcher"

if [ -d "$installed_app" ] && [ "$(cat "$stamp" 2>/dev/null)" = "$source_app" ]; then
  exit 0
fi

cert_hash() {
  { /usr/bin/security find-certificate -c "$cert_name" -Z "$keychain" 2>/dev/null || true; } |
    awk '/^SHA-1 hash:/ { print $3; exit }'
}

staging=$(mktemp -d "${TMPDIR:-/tmp}/pi-app.XXXXXX")
trap 'rm -rf "$staging"' EXIT

hash=$(cert_hash)
if [ -z "$hash" ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 7300 \
    -subj "/CN=$cert_name" \
    -addext "basicConstraints=critical,CA:false" \
    -addext "keyUsage=critical,digitalSignature" \
    -addext "extendedKeyUsage=critical,codeSigning" \
    -keyout "$staging/key.pem" -out "$staging/cert.pem" 2>/dev/null
  password=$(openssl rand -hex 16)
  openssl pkcs12 -export -legacy -name "$cert_name" \
    -inkey "$staging/key.pem" -in "$staging/cert.pem" \
    -out "$staging/identity.p12" -passout "pass:$password"
  /usr/bin/security import "$staging/identity.p12" -k "$keychain" \
    -P "$password" -T /usr/bin/codesign >/dev/null
  hash=$(cert_hash)
fi

mkdir -p "$install_dir"
cp -R "$source_app" "$staging/Pi.app"
chmod -R u+w "$staging/Pi.app"
/usr/bin/codesign --force --keychain "$keychain" --sign "$hash" \
  --identifier com.juanibiapina.pi "$staging/Pi.app"

if [ -d "$installed_app" ]; then
  mv "$installed_app" "$staging/previous.app"
fi
mv "$staging/Pi.app" "$installed_app"
printf '%s\n' "$source_app" > "$stamp"
