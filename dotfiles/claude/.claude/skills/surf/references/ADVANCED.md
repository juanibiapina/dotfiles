# Surf - Advanced Commands

Complete reference for advanced surf features beyond basic navigation.

## AI Queries (No API Keys)

Use browser's logged-in session - no API keys, no rate limits.

```bash
surf chatgpt "explain this code"                # ChatGPT query
surf chatgpt "summarize" --with-page            # Include page context
surf gemini "explain quantum computing"         # Gemini query
surf gemini "analyze" --file data.csv           # Attach file
surf perplexity "what is quantum computing"     # Perplexity query
surf perplexity "deep dive" --mode research     # Research mode (Pro)
```

**Requires**: Logged into chatgpt.com, gemini.google.com, or perplexity.ai in Chrome.

## Network Capture

Captures all network requests automatically. Stored in `/tmp/surf/`.

```bash
surf network                         # Recent requests, compact table
surf network --urls                  # URLs only
surf network --origin api.github.com # Filter by origin
surf network --method POST           # Filter by method
surf network --status 4xx,5xx        # Filter by status
surf network --exclude-static        # Skip images/fonts/css/js
surf network.get r_001               # Full request/response details
surf network.body r_001              # Response body
surf network.curl r_001              # Generate curl command
surf network.clear                   # Clear captured data
surf network.stats                   # Capture statistics
```

## Window Management

Isolate agent work in separate window.

```bash
surf window.new "https://example.com"    # Create new window
surf window.list                         # List all windows
surf window.list --tabs                  # Include tab details
surf window.focus 123456                  # Bring to front
surf window.close 123456                  # Close window
```

Target specific window: `surf read --window-id 123456`

## Tab Management (Advanced)

```bash
surf tab.group --name "Work" --color blue    # Add to/create group
surf tab.ungroup                              # Remove from group
surf tab.groups                               # List all groups
surf tab.name "dashboard"                     # Name current tab
surf tab.unname "dashboard"                   # Unregister named tab
surf tab.named                                # List named tabs
```

## Advanced Waiting

```bash
surf wait.element ".loaded"   # Wait for element to appear
surf wait.network             # Wait for network idle
surf wait.url "/dashboard"    # Wait for URL pattern
surf wait.dom                 # Wait for DOM to stabilize
surf wait.load                # Wait for page to fully load
```

## JavaScript Execution

```bash
surf js "return document.title"           # Execute and return
surf js "document.querySelector('.btn').click()"  # Execute
```

## Scrolling (Advanced)

```bash
surf scroll.to              # Scroll element into view
surf scroll.info            # Get scroll position
```

## Cookie Management

```bash
surf cookie.list            # List cookies for current domain
surf cookie.get             # Get specific cookie
surf cookie.set             # Set cookie
surf cookie.clear           # Clear cookies for current domain
```

## Bookmark & History

```bash
surf bookmark.add           # Bookmark current page
surf bookmark.remove        # Remove bookmark
surf bookmark.list          # List bookmarks
surf history.list           # Recent history
surf history.search "query" # Search history
```

## Dialog Handling

```bash
surf dialog.accept          # Accept dialog (alert, confirm, prompt)
surf dialog.dismiss         # Dismiss dialog
surf dialog.info            # Get dialog info
```

## Device & Network Emulation

```bash
surf emulate.network slow3g  # Presets: offline, slow3g, fast3g, 4g
surf emulate.network custom --download 500 --upload 100 --latency 50
surf emulate.cpu 4           # CPU throttling (4x slower)
surf emulate.geo             # Override geolocation
```

## Form Automation

```bash
surf form.fill               # Batch fill form fields (interactive)
surf upload                  # Upload file(s) (interactive)
```

## Performance Tracing

```bash
surf perf.start              # Start performance trace
surf perf.stop               # Stop and get metrics
surf perf.metrics            # Get current metrics
```

## Batch Execution

```bash
surf batch                   # Run commands from stdin (JSON array)
```

Example:
```json
[{"tool":"navigate","args":{"url":"https://example.com"}},{"tool":"wait.load"},{"tool":"page.read"}]
```

## Dev Tools & Frames

```bash
surf console                 # Read console logs/errors
surf frame.list              # List all frames
surf frame.js                # Execute JS in specific frame
```

## Other Commands

```bash
surf zoom                    # Get/set zoom level
surf resize                  # Resize browser window
surf smoke                   # Run smoke tests on URLs
surf health                  # Wait for URL or element
```

## Help

```bash
surf --help-full             # All 50+ commands
surf <command> --help        # Command details
surf --find <query>          # Search commands
```

## Aliases

`snap` → `screenshot` · `read` → `page.read` · `find` → `search` · `go` → `navigate`
