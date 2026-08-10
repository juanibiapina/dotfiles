#!/usr/bin/env bash
# Re-authenticate slackcli from the Slack desktop app's live session.
#
# Both tokens come from the desktop app, so they always belong to the same
# session. The xoxd cookie is encrypted with a key held in the login keychain,
# so macOS raises an approval prompt on first read.
set -euo pipefail

SLACK_DIR="$HOME/Library/Application Support/Slack"
COOKIES_DB="$SLACK_DIR/Cookies"
LEVELDB="$SLACK_DIR/Local Storage/leveldb"

die() { echo "error: $*" >&2; exit 1; }

[[ -f "$COOKIES_DB" ]] || die "no cookie database at $COOKIES_DB — is the Slack desktop app installed?"
[[ -d "$LEVELDB" ]] || die "no local storage at $LEVELDB — is the Slack desktop app installed?"

WORK=$(mktemp -d); chmod 700 "$WORK"
trap 'rm -rf "$WORK"' EXIT

# --- xoxc candidates -------------------------------------------------------
# Rotated tokens linger in the log and table files, so search both and let
# auth.test pick the live one.
{ strings "$LEVELDB"/*.ldb 2>/dev/null || true; strings "$LEVELDB"/*.log 2>/dev/null || true; } \
  | grep -o 'xoxc-[A-Za-z0-9-]*' | sort -u > "$WORK/xoxc"
[[ -s "$WORK/xoxc" ]] || die "no xoxc token in local storage — sign in to the desktop app first"
echo "found $(wc -l < "$WORK/xoxc" | tr -d ' ') xoxc candidate(s)"

# --- xoxd cookie -----------------------------------------------------------
# Chromium scheme: PBKDF2-HMAC-SHA1(keychain password, "saltysalt", 1003) ->
# AES-128-CBC, IV of 16 spaces, over encrypted_value after its "v10" prefix.
echo "reading the keychain (approve the prompt if macOS asks)..."
KEYCHAIN_PW=$(security find-generic-password -s "Slack Safe Storage" -a "Slack" -w) \
  || die "could not read the 'Slack Safe Storage' keychain item"

KEY_HEX=$(KEYCHAIN_PW="$KEYCHAIN_PW" python3 -c '
import hashlib, os
pw = os.environb[b"KEYCHAIN_PW"]
print(hashlib.pbkdf2_hmac("sha1", pw, b"saltysalt", 1003, 16).hex())
')

python3 - "$COOKIES_DB" "$WORK/cipher" <<'PY'
import sqlite3, sys
db, out = sys.argv[1], sys.argv[2]
con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
row = con.execute(
    "select encrypted_value from cookies where name='d' and host_key='.slack.com'"
).fetchone()
if not row:
    sys.exit("error: no 'd' cookie for .slack.com — sign in to the desktop app first")
blob = row[0]
if blob[:3] != b"v10":
    sys.exit(f"error: unexpected cookie encryption prefix {blob[:3]!r}")
open(out, "wb").write(blob[3:])
PY

openssl enc -d -aes-128-cbc \
  -K "$KEY_HEX" \
  -iv 20202020202020202020202020202020 \
  -in "$WORK/cipher" -out "$WORK/plain" \
  || die "cookie decryption failed — the keychain password may not match this cookie database"

# Newer Chromium prefixes the plaintext with a 32-byte domain hash. The value is
# stored percent-encoded, and the two consumers want different forms: a Cookie
# header needs it as stored, slackcli needs it decoded. Either one fed the wrong
# form fails as invalid_auth, exactly like a bad token would.
python3 - "$WORK/plain" "$WORK/xoxd_wire" "$WORK/xoxd" <<'PY'
import sys, urllib.parse
raw = open(sys.argv[1], "rb").read()
for skip in (32, 0):
    try:
        value = raw[skip:].decode()
    except UnicodeDecodeError:
        continue
    if value.startswith("xoxd-"):
        open(sys.argv[2], "w").write(value)
        open(sys.argv[3], "w").write(urllib.parse.unquote(value))
        break
else:
    sys.exit("error: decrypted cookie does not look like an xoxd token")
PY
XOXD_WIRE=$(cat "$WORK/xoxd_wire")
XOXD=$(cat "$WORK/xoxd")
echo "decrypted the xoxd cookie (${#XOXD} chars)"

# --- pick the live token ---------------------------------------------------
# auth.test names the workspace, which is the only way to notice a token that
# authenticates against a different workspace than the one you wanted.
XOXC=""
while read -r candidate; do
  read -r ok team user <<<"$(curl -s -X POST https://slack.com/api/auth.test \
    -H "Cookie: d=$XOXD_WIRE" --data-urlencode "token=$candidate" \
    | python3 -c '
import json, sys
d = json.load(sys.stdin)
print(d.get("ok"), d.get("team") or d.get("error"), d.get("user") or "-")
')"
  if [[ "$ok" == "True" ]]; then
    echo "authenticated as $user in workspace: $team"
    XOXC="$candidate"
    break
  fi
  echo "  rejected (...${candidate: -8}): $team"
done < "$WORK/xoxc"

[[ -n "$XOXC" ]] || die "no candidate authenticated — sign in to the desktop app again, then rerun"

# --- store and confirm -----------------------------------------------------
slackcli auth login-browser --xoxc "$XOXC" --xoxd "$XOXD" \
  --workspace-url "https://contentful.slack.com"
