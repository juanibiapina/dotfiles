---
name: surf
description: Control Chrome browser via CLI for testing, automation, and debugging. Use when the user needs browser automation, screenshots, form filling or page inspection.
---

# Surf Browser Automation

Control Chrome browser via CLI.

## CLI Quick Reference

```bash
surf --help                    # Full help
surf <group>                   # Group help (tab, scroll, page, wait, dialog, emulate, form, perf)
surf --list                    # All 60+ tools
surf --find <term>             # Search tools
```

## Core Workflow

```bash
# 1. Navigate to page
surf navigate "https://example.com"

# 2. Read page to get element refs
surf page.read

# 3. Click by ref or coordinates
surf click --ref "e1"
surf click --x 100 --y 200

# 4. Type text
surf type --text "hello"

# 5. Screenshot
surf screenshot --output /tmp/shot.png
```

## Tab Management

```bash
surf tab.list
surf tab.new "https://google.com"
surf tab.switch 12345
surf tab.close 12345

# Named tabs (aliases)
surf tab.name myapp            # Name current tab
surf tab.switch myapp          # Switch by name
surf tab.named                 # List named tabs
```

## Window Management

```bash
surf window.list                              # List all windows
surf window.new                               # New window
surf window.new --url "https://example.com"   # New window with URL
surf window.new --incognito                   # New incognito window
surf window.focus 12345                       # Focus window by ID
surf window.close 12345                       # Close window
surf window.resize --width 1920 --height 1080 # Resize current window
```

## Input Methods

```bash
# CDP method (real events) - default
surf type --text "hello"
surf click --x 100 --y 200

# JS method (DOM manipulation) - for contenteditable
surf type --text "hello" --selector "#input" --method js

# Keys
surf key Enter
surf key "cmd+a"
surf key.repeat --key Tab --count 5           # Repeat key presses
```

## Page Inspection

```bash
surf page.read                 # Accessibility tree with refs (viewport only)
surf page.read --ref e5        # Get specific element details
surf page.read --all           # All elements (may hit 50K char limit on large pages)
surf page.text                 # Full page text content (no limit)
surf page.state                # Modals, loading state, scroll info
```

**When to use which:**
- **`page.text`** - Get full page text content. No size limit. Best for reading/understanding page content.
- **`page.read`** - Get element refs for visible viewport. Use when you need to interact (click, type).
- **`page.read --all`** - All elements with refs. Can fail on large pages (50K char limit).

**Note:** `page.read` returns only elements in the visible viewport. Refs remain valid for off-screen elements - you can still `click e5` even after scrolling. Use `scroll.to --ref e5` to bring an element into view.

## Scrolling

```bash
surf scroll down               # Scroll down (default amount)
surf scroll up                 # Scroll up
surf scroll down --amount 5    # Scroll down more (1-10)
surf scroll.bottom             # Scroll to bottom of page
surf scroll.top                # Scroll to top of page
surf scroll.to --ref e5        # Scroll element into view
surf scroll.info               # Get scroll position
```

## Waiting

```bash
surf wait 2                    # Wait 2 seconds
surf wait.element ".loaded"    # Wait for element
surf wait.network              # Wait for network idle
surf wait.url "/success"       # Wait for URL pattern
surf wait.dom --stable 100     # Wait for DOM stability
surf wait.load                 # Wait for page load complete
```

## Dialog Handling

```bash
surf dialog.info               # Get current dialog type/message
surf dialog.accept             # Accept (OK)
surf dialog.accept --text "response"  # Accept prompt with text
surf dialog.dismiss            # Dismiss (Cancel)
```

## Device/Network Emulation

```bash
# Network throttling
surf emulate.network slow-3g   # Presets: slow-3g, fast-3g, 4g, offline
surf emulate.network reset     # Disable throttling

# CPU throttling  
surf emulate.cpu 4             # 4x slower
surf emulate.cpu 1             # Reset

# Device emulation
surf emulate.device "iPhone 14"
surf emulate.device --list     # List available devices

# Geolocation
surf emulate.geo --lat 37.7749 --lon -122.4194
surf emulate.geo --clear
```

## Form Automation

```bash
surf page.read                 # Get element refs first

# Fill by ref
surf form.fill --data '[{"ref":"e1","value":"John"},{"ref":"e2","value":"john@example.com"}]'

# Checkboxes: true/false
surf form.fill --data '[{"ref":"e7","value":true}]'
```

## File Upload

```bash
surf upload --ref e5 --files "/path/to/file.txt"
surf upload --ref e5 --files "/path/file1.txt,/path/file2.txt"
```

## Network Inspection

```bash
surf network                   # List captured requests
surf network --stream          # Real-time network events
surf network.body --id "req-123"  # Get response body
surf network.clear             # Clear captured requests
```

## Console

```bash
surf console                   # Get console messages
surf console --stream          # Real-time console
surf console --stream --level error  # Errors only
```

## JavaScript Execution

```bash
surf js "return document.title"
surf js "document.querySelector('.btn').click()"
```

## Iframe Handling

```bash
surf frame.list                # List frames with IDs
surf frame.js --id "FRAME_ID" --code "return document.title"
```

## Performance

```bash
surf perf.metrics              # Current metrics snapshot
surf perf.start                # Start trace
surf perf.stop                 # Stop and get results
```

## Screenshots

```bash
surf screenshot                           # To stdout (base64)
surf screenshot --output /tmp/shot.png    # Save to file
surf screenshot --selector ".card"        # Element only
surf screenshot --full-page               # Full page scroll capture
```

## Cookies & Storage

```bash
surf cookies                   # List cookies for current page
surf cookies --domain .google.com
surf cookie.set --name "token" --value "abc123"
surf cookie.delete --name "token"
```

## History & Bookmarks

```bash
surf history --query "github" --max 20
surf bookmarks --query "docs"
surf bookmark.add --url "https://..." --title "My Bookmark"
```

## Health Checks & Smoke Tests

```bash
surf health --url "http://localhost:3000"
surf smoke --urls "http://localhost:3000" "http://localhost:3000/about"
surf smoke --urls "..." --screenshot /tmp/smoke
```

## Error Diagnostics

```bash
# Auto-capture screenshot + console on failure
surf wait.element ".missing" --auto-capture --timeout 2000
# Saves to /tmp/surf-error-*.png
```

## Common Options

```bash
--tab-id <id>         # Target specific tab
--json                # Raw JSON output  
--auto-capture        # Screenshot + console on error
--timeout <ms>        # Override default timeout
```

## Tips

1. **First CDP operation is slow** (~5-8s) - debugger attachment overhead, subsequent calls fast
2. **Use refs from page.read** for reliable element targeting over CSS selectors
3. **JS method for contenteditable** - Modern editors (Notion, etc.) need `--method js`
4. **Named tabs for multi-step tasks** - `tab.name app` then `tab.switch app`
5. **Auto-capture for debugging** - `--auto-capture` saves diagnostics on failure
