---
name: yt-dlp
description: Download videos, extract audio, and get transcripts from YouTube and 1000+ sites. Use when asked to download a video, extract audio, get a transcript, rip subtitles, or fetch media. Triggers on "download video", "yt-dlp", "extract audio", "YouTube download", "get transcript", "subtitles", or any media download request.
---

# yt-dlp

Use `yt-dlp` to download media, extract audio, and fetch subtitles.

## Common tasks

```bash
# transcript
yt-dlp --write-auto-subs --sub-lang en --convert-subs srt --skip-download -o "transcript" <url>

# manual subtitles when available
yt-dlp --write-subs --sub-lang en --convert-subs srt --skip-download -o "transcript" <url>

# list subtitles
yt-dlp --list-subs <url>

# download video
yt-dlp <url>
yt-dlp -F <url>
yt-dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" <url>

# extract audio
yt-dlp -x --audio-format mp3 <url>

# playlist
yt-dlp --flat-playlist --print "%(title)s %(url)s" <playlist-url>

# metadata
yt-dlp --dump-json <url>
```

## Tips

- Use `--no-playlist` to force a single video.
- Use `--cookies-from-browser chrome` for restricted content.
- Subtitle files can be cleaned into plain text after download.
