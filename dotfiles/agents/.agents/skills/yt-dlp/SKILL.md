---
name: yt-dlp
description: Download videos, extract audio, and get transcripts from YouTube and 1000+ sites. Use when asked to download a video, extract audio, get a transcript, rip subtitles, or fetch media. Triggers on "download video", "yt-dlp", "extract audio", "YouTube download", "get transcript", "subtitles", or any media download request.
---

# yt-dlp

Video/audio downloader supporting YouTube and 1000+ sites.

## Transcripts

Extract transcript text from YouTube videos.

```bash
# Get auto-generated transcript (most YouTube videos have this)
yt-dlp --write-auto-subs --sub-lang en --convert-subs srt --skip-download -o "transcript" <url>
cat transcript.en.srt | sed '/^[0-9]*$/d; /^$/d; /-->/d' | awk '!seen[$0]++'

# Get manual/uploaded subtitles (higher quality when available)
yt-dlp --write-subs --sub-lang en --convert-subs srt --skip-download -o "transcript" <url>
cat transcript.en.srt | sed '/^[0-9]*$/d; /^$/d; /-->/d' | awk '!seen[$0]++'

# List available subtitle languages
yt-dlp --list-subs <url>

# Get subtitles in a specific language
yt-dlp --write-auto-subs --sub-lang es --convert-subs srt --skip-download -o "transcript" <url>

# Keep timestamps (raw SRT)
yt-dlp --write-auto-subs --sub-lang en --convert-subs srt --skip-download -o "transcript" <url>
cat transcript.en.srt
```

**Tip:** Use `--write-auto-subs` for auto-generated captions (available on most YouTube videos). Use `--write-subs` for human-uploaded subtitles (fewer videos, but higher quality).

## Download Video

```bash
# Best quality (default)
yt-dlp <url>

# Specific quality
yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]" <url>
yt-dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" <url>

# List available formats
yt-dlp -F <url>

# Pick a specific format by ID
yt-dlp -f 137+140 <url>

# Output to specific path
yt-dlp -o "/path/to/%(title)s.%(ext)s" <url>
```

## Extract Audio

```bash
# Extract audio as mp3
yt-dlp -x --audio-format mp3 <url>

# Best audio quality
yt-dlp -x --audio-format mp3 --audio-quality 0 <url>

# Other formats: m4a, wav, flac, opus
yt-dlp -x --audio-format m4a <url>
```

## Playlists

```bash
# Download entire playlist
yt-dlp <playlist-url>

# Download specific items (1-indexed)
yt-dlp --playlist-items 1,3,5 <playlist-url>
yt-dlp --playlist-items 1:5 <playlist-url>

# Extract audio from playlist
yt-dlp -x --audio-format mp3 <playlist-url>

# List playlist contents without downloading
yt-dlp --flat-playlist --print "%(title)s %(url)s" <playlist-url>
```

## Video Info

```bash
# Print title
yt-dlp --print title <url>

# Print metadata as JSON
yt-dlp --dump-json <url>

# Print duration, view count, etc.
yt-dlp --print "%(title)s | %(duration>%H:%M:%S)s | %(view_count)s views" <url>
```

## Output Templates

Common placeholders for `-o`:

```bash
%(title)s        # Video title
%(id)s           # Video ID
%(ext)s          # File extension
%(upload_date)s  # Upload date (YYYYMMDD)
%(channel)s      # Channel name
%(playlist)s     # Playlist name
%(playlist_index)s  # Position in playlist
```

Example: `yt-dlp -o "%(channel)s/%(title)s.%(ext)s" <url>`

## Tips

- Use `--no-playlist` to download a single video from a playlist URL
- Use `--cookies-from-browser chrome` for age-restricted or private content
- Use `--limit-rate 1M` to throttle download speed
- Use `--download-archive archive.txt` to skip already-downloaded videos
- Supports 1000+ sites beyond YouTube. Try any video URL.
