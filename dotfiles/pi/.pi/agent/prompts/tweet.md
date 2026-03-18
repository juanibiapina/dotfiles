---
description: Post, read, and interact with X (Twitter) via the xurl CLI
---

# Tweet

$ARGUMENTS

## Posting

The free API tier limits posts to 280 characters. Posts over 280 characters fail with a misleading `403 Forbidden` error.

URLs count as ~23 characters regardless of actual length (t.co shortening).

Draft a post under 280 characters (URLs count as ~23 due to t.co shortening). Find and tag relevant @handles for any people, projects, or products mentioned. If over 280, condense rather than splitting into threads. Post with `xurl post` and return the post URL (`https://x.com/i/status/<id>`).

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

# Media (defaults are for video — you MUST set --category and --media-type for images/GIFs)
xurl media upload photo.jpg --category tweet_image --media-type image/jpeg
xurl media upload photo.png --category tweet_image --media-type image/png
xurl media upload anim.gif  --category tweet_gif   --media-type image/gif
xurl media upload clip.mp4  --category tweet_video --media-type video/mp4

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
