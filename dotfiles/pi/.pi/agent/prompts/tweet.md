---
description: Post, read, and interact with X (Twitter) via the xurl CLI
---

# Tweet

$ARGUMENTS

## Posting

The free API tier limits posts to 280 characters. Posts over 280 characters fail with a misleading `403 Forbidden` error.

URLs count as ~23 characters regardless of actual length (t.co shortening).

### Workflow

1. Draft the post text
2. Check for people, projects, or products mentioned and find their X handles (search if needed). Tag them with @mentions
3. Count characters (must be under 280, URLs count as ~23)
4. If over 280, condense. Do not split into threads without asking
5. Post with `xurl post "text"`
6. On success, construct the URL: `https://x.com/i/status/<id>`

## Commands

```bash
# Posting
xurl post "Hello world!"                              # Post
xurl post "Check this out" --media-id 12345            # Post with media
xurl reply 1234567890 "Nice!"                          # Reply
xurl quote 1234567890 "Interesting take"               # Quote
xurl delete 1234567890                                 # Delete

# Reading
xurl read 1234567890                                   # Read by ID
xurl read https://x.com/user/status/1234567890         # Read by URL

# Media
xurl media upload path/to/image.jpg                    # Upload (returns media ID)

# Account
xurl whoami                                            # Show profile
```

## Authentication

If you get `401 Unauthorized`, the OAuth2 token has expired:

1. Start auth: `gob add xurl auth oauth2 --app myapp`
2. Get the URL: `gob logs <job_id>`
3. Ask the user to visit the URL and authorize
4. User gives back the callback URL. Submit it: `curl -s "<callback_url>"`
5. Verify with `xurl whoami`
