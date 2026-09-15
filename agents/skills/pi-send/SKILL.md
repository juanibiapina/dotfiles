---
name: pi-send
description: Send a message to another running pi session via its Unix socket. Use when the user wants to hand off context to another session, continue a conversation elsewhere, or notify another pi instance.
---

# Pi Send

Send a message to one active Pi session through the `pi-live` extension. Each
running Pi process publishes a status record at
`~/.local/share/pi/status/<session-id>.json`. The record contains its unique
Unix socket path.

## Find the target session

List the published records:

```bash
for file in ~/.local/share/pi/status/*.json; do
  jq '{sessionId, name, cwd, state, tmux, socketPath}' "$file"
done
```

Select the target by `sessionId`. Do not select only by cwd because multiple Pi
sessions can use the same directory.

Read its socket path:

```bash
STATUS=~/.local/share/pi/status/<session-id>.json
SOCKET=$(jq -r '.socketPath' "$STATUS")
```

## Send a message

The protocol uses newline-delimited JSON. Send a `send_user_message` request:

```bash
echo '{"type":"send_user_message","message":"your message here"}' | nc -U "$SOCKET"
```

A successful response has this shape:

```json
{"ok":true,"result":{"accepted":true,"delivery":"immediate"}}
```

Build the JSON payload safely when the message contains special characters:

```bash
PAYLOAD=$(python3 -c "import json,sys; msg=sys.stdin.read(); print(json.dumps({'type':'send_user_message','message':msg}))" <<< "$MESSAGE")
echo "$PAYLOAD" | nc -U "$SOCKET"
```

## Other request types

- `{"type":"ping"}` returns `pong` when the Pi process is live.
- `{"type":"get_state"}` returns `sessionId`, `cwd`, `state`, `idle`,
  `sessionName`, and `sessionFile`.
- `{"type":"abort"}` aborts the current operation.
- `{"type":"shutdown"}` shuts down the Pi session.

## Errors and limits

- Use `nc`, not `socat`.
- Terminate each JSON request with a newline.
- If the target is busy, the default delivery is `followUp`.
- An `immediate` request returns `busy` when the target is not idle.
- The maximum text-message size is 256KB.
- If `ping` fails, treat the status record as stale.
