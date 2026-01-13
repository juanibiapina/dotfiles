---
name: surf
description: >
  Browser automation CLI for Chrome. Use when user wants to browse websites,
  read page content, click elements, fill forms, or take screenshots.
---

# Surf - Browser Automation

Control Chrome via CLI. Assumes surf-cli is installed and configured.

## Core Commands

```bash
# Navigation
surf go "https://example.com"
surf back
surf forward

# Read page (returns element refs like e1, e2, e3)
surf read
surf search "text"

# Interact (use element refs from surf read)
surf click e5
surf type "text" --ref e12
surf type "text" --submit    # Type and press Enter
surf key Enter

# Screenshots (auto-captured after click/type/scroll)
surf screenshot

# Tabs
surf tab.list
surf tab.new "https://example.com"
surf tab.switch <id>

# Wait
surf wait 2
surf wait.network
```

## Typical Workflow

1. `surf go "url"` - Navigate
2. `surf read` - Get element refs
3. `surf click e5` or `surf type "text" --ref e12` - Interact
4. Screenshot is auto-captured after interactions

## Limitations

- Cannot automate chrome:// pages or Chrome Web Store
