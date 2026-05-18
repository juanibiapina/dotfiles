---
name: pi-send
description: Send a message to another running pi session via its Unix socket. Use when the user wants to hand off context to another session, continue a conversation elsewhere, or notify another pi instance.
---

# Pi Send

Send a message to another active pi session using the pi-socket extension. Each pi session exposes a Unix socket at `<cwd>/.local/share/pi/socket` and a metadata file at `<cwd>/.local/share/pi/socket.info.json`.

## Finding the target session

Sessions always run from a project directory at `$WORKSPACE/<owner>/<repo>`. The socket info file is at:

```bash
cat $WORKSPACE/<owner>/<repo>/.local/share/pi/socket.info.json
```

Fields: `socketPath`, `cwd`, `pid`, `sessionFile`, `startedAt`.

## Sending a message

Protocol: newline-delimited JSON over the Unix socket. Send a `send_user_message` request:

```bash
echo '{"type":"send_user_message","message":"your message here"}' | nc -U <socketPath>
```

Response: `{"ok":true,"result":{"accepted":true,"delivery":"immediate"}}` on success.

Build the JSON payload safely to handle special characters:

```bash
PAYLOAD=$(python3 -c "import json,sys; msg=sys.stdin.read(); print(json.dumps({'type':'send_user_message','message':msg}))" <<< "$MESSAGE")
echo "$PAYLOAD" | nc -U <socketPath>
```

## Other request types

- `{"type":"ping"}` — check if session is alive, returns `pong`
- `{"type":"get_state"}` — returns `cwd`, `idle`, `sessionName`, `sessionFile`
- `{"type":"abort"}` — abort current operation
- `{"type":"shutdown"}` — shut down the session

## Gotchas

- `nc` must be used, not `socat` (not available)
- The message must be a single JSON line terminated with `\n` — `nc -U` handles this
- If the session is busy, `delivery` will be `followUp` (queued) instead of `immediate`
- Max message size is 256KB
