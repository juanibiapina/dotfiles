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

When commands fail with `invalid_auth`, it means the `xoxd` session cookie has expired. Refresh from the desktop app's live session:

```bash
./scripts/refresh-tokens.sh
```

It authenticates slackcli and prints the workspace and user it authenticated as. Read that line: a run that succeeds against the *wrong* workspace looks identical to success otherwise. macOS prompts once to approve reading the login keychain.

### When it can't authenticate

- **No candidate authenticated** — the desktop app is signed out of the workspace. Sign in there, then rerun.
- **Take both tokens from the desktop app**, as the script does. Chrome holds an independent session that is often signed into a different workspace, so a cookie lifted from it authenticates to nothing while looking perfectly well-formed. `contentful.slack.com` showing "Sign in with your Okta account" is that state.
- **Hand-carrying tokens** — the cookie is stored percent-encoded, and its two consumers disagree: a `Cookie:` header wants it as stored, slackcli wants it decoded. Feeding either the wrong form fails as `invalid_auth`, indistinguishable from a dead token. `curl -X POST https://slack.com/api/auth.test -H "Cookie: d=<encoded>" --data-urlencode "token=<xoxc>"` is ground truth, and names the workspace.
