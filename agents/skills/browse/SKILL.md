---
name: browse
description: Control Chrome browser via CLI for testing, automation, and debugging. Use when the user needs browser automation, screenshots, form filling or page inspection.
---

# Browse Browser Automation

Control Chrome with the `browse` CLI.

## Core flow

```bash
browse tab.new "https://example.com"
browse page.read
browse click --ref e1
browse type --text "hello"
browse screenshot --output /tmp/shot.png
```

## Use these most

```bash
browse tab.list
browse tab.switch <id>
browse navigate "https://example.com"
browse page.read
browse page.read --all
browse page.text
browse click --ref e1
browse type --text "hello"
browse key Enter
browse scroll down
browse scroll.to --ref e5
browse wait 2
browse wait.element ".loaded"
browse wait.network
browse screenshot --output /tmp/shot.png
browse console
browse network
browse js "return document.title"
```

## Rules

- Use `tab.new` to start a new page.
- Use `navigate` only in an existing tab.
- Use `page.read` when you need element refs.
- Use `page.text` when you need page content.
- Prefer refs from `page.read` over CSS selectors.
- For contenteditable fields, use JS input when normal typing fails.

## Tips

- The first CDP action is often slow.
- `page.read` shows the visible viewport by default.
- Refs stay usable after scrolling.
- Use `--auto-capture` on failing waits for screenshot and console output.
