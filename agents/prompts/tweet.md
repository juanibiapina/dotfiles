---
description: Post, read, and interact with X (Twitter) via the xurl CLI
---

# Tweet

$ARGUMENTS

## Posting

The free API tier rejects posts over 280 characters, often as `403 Forbidden`.

Draft a post under 280 characters. Count URLs as about 23 characters. Tag relevant `@handles`. If too long, condense it instead of making a thread. Post with `xurl post` and return the post URL.

## Commands

```bash
xurl post "Hello world!"
xurl reply 1234567890 "Nice!"
xurl quote 1234567890 "Interesting"
xurl delete 1234567890
xurl read 1234567890
xurl read https://x.com/user/status/1234567890
xurl whoami
```

## Authentication

If you get `401 Unauthorized`:
1. `gob add xurl auth oauth2 --app myapp`
2. `gob logs <job_id>`
3. Ask the user to authorize the URL
4. Submit the callback URL with `curl -s "<callback_url>"`
5. Verify with `xurl whoami`
