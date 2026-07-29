---
name: slackcli
description: Use slackcli to read channels, read threads, and send messages in Slack.
---

# slackcli

CLI tool for Slack (`shaharia-lab/slackcli`). Uses browser session tokens (xoxc + xoxd).

Config lives at `~/.config/slackcli/workspaces.json`.

## Basic Usage

### Read a channel

```bash
slackcli conversations read <channel-id>
```

### Read a thread

```bash
slackcli conversations read <channel-id> --thread-ts <timestamp>
```

**Parsing Slack URLs:**
Format: `https://workspace.slack.com/archives/<channel-id>/p<timestamp>`
Convert timestamp: remove `p` prefix, insert `.` before last 6 digits.
Example: `p1785239208279999` → `1785239208.279999`

### List channels

```bash
slackcli conversations list
```

### Send a message

```bash
slackcli messages send --recipient-id <channel-id> --message "text"
```

## Token Expiry

If any command returns `invalid_auth`, the tokens are stale. Run the refresh procedure below.

## Refreshing Tokens

Two tokens are needed: `xoxc` (auth token) and `xoxd` (session cookie).

### 1. Extract xoxc from the Slack desktop app

The desktop app stores tokens in a LevelDB database:

```bash
strings ~/Library/Application\ Support/Slack/Local\ Storage/leveldb/*.ldb \
  | grep -o 'xoxc-[^ "\\]*' \
  | sort -u
```

Multiple tokens may appear — try the most recent-looking one (highest numeric segment). If one fails authentication, try the next.

### 2. Extract xoxd from the browser

The Slack workspace must be open and authenticated in Chrome. Open it if needed:

```bash
browse tab.new "https://contentful.slack.com"
# wait for it to load, then:
TAB_ID=<tab-id from output>
```

Extract the cookie:

```bash
browse cookie.list --domain app.slack.com --tab-id <TAB_ID> 2>&1 | python3 -c "
import sys, json, urllib.parse
data = json.load(sys.stdin)
for c in data:
    if c.get('name') == 'd':
        print(urllib.parse.unquote(c['value']))
        break
"
```

### 3. Authenticate slackcli

```bash
slackcli auth login-browser \
  --xoxc "<xoxc token>" \
  --xoxd "<xoxd token>" \
  --workspace-url "https://contentful.slack.com"
```

A successful run prints `Authentication successful!`. If it prints `not_authed`, the xoxc is wrong — try a different one from step 1.

### 4. Persist the tokens

Update `~/workspace/juanibiapina/dotfiles/secrets/zshrc.secret` so future shells pick them up:

```
export SLACK_XOXD="<new xoxd>"
export SLACK_XOXC="<new xoxc>"
```

The `slackcli` config (`~/.config/slackcli/workspaces.json`) is already updated by step 3. The secrets file update ensures the env vars stay in sync for tools that read them directly.
