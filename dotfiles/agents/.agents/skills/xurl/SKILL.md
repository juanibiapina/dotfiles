---
name: xurl
description: Post, read, search, and interact with X (Twitter) via the xurl CLI. Use when asked to tweet, post to X, reply to a tweet, read a post, search X, delete a tweet, quote tweet, or any X/Twitter interaction. Triggers on "tweet", "post to X", "post on Twitter", "reply to tweet", "xurl", "share on X", or any X/Twitter request.
---

# X (Twitter) via xurl

Interact with X using the `xurl` CLI.

## Critical constraint

**The free API tier limits posts to 280 characters.** Posts over 280 characters fail with a misleading `403 Forbidden` error (no helpful message). Always count characters before posting. URLs count as ~23 characters (t.co shortening).

## Commands

```bash
# Posting
xurl post "Hello world!"                              # Post
xurl post "Check this out" --media-id 12345            # Post with media
xurl reply 1234567890 "Nice!"                          # Reply to a post
xurl quote 1234567890 "Interesting take"               # Quote a post
xurl delete 1234567890                                 # Delete a post

# Reading
xurl read 1234567890                                   # Read a post
xurl read https://x.com/user/status/1234567890         # Read by URL
xurl search "golang" -n 20                             # Search posts
xurl timeline                                          # Home timeline
xurl mentions                                          # Your mentions

# Social
xurl like 1234567890                                   # Like
xurl repost 1234567890                                 # Repost
xurl follow @user                                      # Follow
xurl dm @user "Hey!"                                   # Direct message

# Media
xurl media upload path/to/image.jpg                    # Upload media (returns media ID)

# Account
xurl whoami                                            # Show your profile
```

All commands accept post IDs or full URLs (e.g., `https://x.com/user/status/1234567890`).

## Workflow for posting

1. Draft the post text
2. Count characters - must be under 280. URLs count as ~23 chars regardless of actual length
3. If over 280, condense. Do not split into threads without asking
4. Post with `xurl post "text"`
5. On success, the response includes the post ID. Construct the URL: `https://x.com/i/status/<id>`

## Debugging

- Use `-v` flag for verbose request/response info
- `403 Forbidden` with no detail usually means the post exceeds 280 characters
- `CreditsDepleted` means API quota is exhausted - try again later
