# Firefox MCP Browser Automation Investigation

**Date:** 2025-11-02
**Goal:** Find an MCP server for Claude Code to control a locally running Firefox browser with simultaneous user interaction and access to logged-in sessions.

## Requirements

- Control a locally running browser (preferably Firefox)
- Allow simultaneous user interaction
- Access existing logged-in sessions
- Ability to fill in credentials and interact with forms
- Ideally work with existing Firefox instance

## Key Finding: Architecture Trade-off

There's a fundamental tension in browser automation:
- **Read-only access** to existing browser (safe, simultaneous interaction possible)
- **Full automation** requires launching separate browser instance (better control, but not truly simultaneous)

---

## Recommended Solutions

### 🥇 Firefox DevTools MCP (Best for Full Automation)

**GitHub:** https://github.com/freema/firefox-devtools-mcp
**Registry:** https://glama.ai/mcp/servers/@freema/firefox-devtools-mcp

**Pros:**
- ✅ Full automation (form filling, clicking, typing)
- ✅ WebDriver BiDi-based (modern Firefox automation standard)
- ✅ Session management and persistence
- ✅ Network monitoring, console access, screenshots
- ✅ Element interaction with snapshot/UID-based methods
- ✅ Very active maintenance (v0.2.5, October 2025)

**Cons:**
- ⚠️ Single Firefox instance per server (not truly simultaneous user interaction)
- ⚠️ New project (1 star)

**Installation:**
```bash
npx @freema/firefox-devtools-mcp@latest
```

**Claude Code MCP Configuration:**
```bash
claude mcp add firefox-devtools npx firefox-devtools-mcp@latest
```

**Capabilities:**
- Page management (list, create, navigate, close)
- Element interaction with snapshot/UID-based methods
- Network monitoring with always-on logging
- Console access and message capture
- Full-page and element-specific screenshots
- Dialog handling
- Viewport control
- Form filling tools: `fill_by_uid`, `fill_form_by_uid`

---

### 🥈 Browser Control MCP (Best for Existing Firefox)

**GitHub:** https://github.com/eyalzh/browser-control-mcp
**Firefox Extension:** https://addons.mozilla.org/en-US/firefox/addon/browser-control-mcp/

**Pros:**
- ✅ Official Firefox extension (1,335 daily users)
- ✅ Uses your existing Firefox with all logged-in sessions
- ✅ You can interact simultaneously
- ✅ Security-focused with user consent per domain
- ✅ Active maintenance (v1.5.1, July 2025)
- ✅ 194 stars

**Cons:**
- ❌ **Read-only** (cannot fill forms or click buttons)
- ❌ Known issue with Claude Desktop startup
- ⚠️ Limited automation capabilities

**Installation:**
1. Install Firefox extension from Mozilla Add-ons
2. Get EXTENSION_SECRET from extension preferences
3. Install MCP server:
```bash
npm install browser-control-mcp
```

**Claude Code MCP Configuration:**
```json
{
  "mcpServers": {
    "browser-control": {
      "command": "npx",
      "args": ["-y", "browser-control-mcp"],
      "env": {
        "EXTENSION_SECRET": "<from extension preferences>",
        "EXTENSION_PORT": "8089"
      }
    }
  }
}
```

**Capabilities:**
- Tab management (open, close, list, reorder, group with colors)
- Browser history search and retrieval
- Webpage text content and link extraction
- Text finding and highlighting in browser tabs
- Google Scholar search integration

---

### 🥉 Microsoft Playwright MCP (Enterprise-Grade)

**GitHub:** https://github.com/microsoft/playwright-mcp

**Pros:**
- ✅ Supports Firefox (and Chrome, Edge, WebKit)
- ✅ Full automation capabilities
- ✅ Persistent profiles or isolated contexts
- ✅ Storage state for authentication persistence
- ✅ Well-maintained by Microsoft (22.7k stars, 407 commits)
- ✅ Structured accessibility snapshots (no screenshots needed)

**Cons:**
- ⚠️ Launches separate Firefox instance (not your existing one)
- ⚠️ Extension mode only works with Chrome (not Firefox)

**Installation:**
```bash
npx @playwright/mcp@latest --browser firefox
```

**Claude Code MCP Configuration (Basic):**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--browser", "firefox"]
    }
  }
}
```

**With Persistent Profile:**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--browser", "firefox",
        "--user-data-dir", "/path/to/firefox/profile"
      ]
    }
  }
}
```

**Capabilities:**
- Full browser automation (navigation, clicking, typing, form filling)
- Screenshot capture
- JavaScript execution
- Accessibility tree navigation
- Multi-tab support

---

## Other Options Evaluated

### MCPMonkey
**GitHub:** https://github.com/kstrikis/MCPMonkey

- Fork of Violentmonkey with MCP support
- Tab management and page style extraction
- Userscript-based extensibility
- v0.4.0-alpha (February 2025)
- Requires manual extension loading via about:debugging

### Firefox MCP Server (JediLuke)
**GitHub:** https://github.com/JediLuke/firefox-mcp-server

- Playwright-based Firefox automation
- Multi-tab support with isolated contexts
- Advanced debugging (console logs, errors, WebSocket messages)
- Performance metrics (DOM timing, memory)
- 13 stars
- Requires local installation: `npm install` + `npx playwright install firefox`

### Browser Control MCP Firefox Fork
**GitHub:** https://github.com/menonpg/browser-control-mcp-firefox

- Fork of eyalzh's browser-control-mcp specifically for Firefox
- Similar features to original
- Requires manual extension loading

### Firefox MCP (gruence)
**GitHub:** https://github.com/gruence/firefox-mcp

- Lightweight Node.js bridge with zero dependencies
- WebSocket interface (ws://localhost:8080)
- Native Messaging for secure Firefox communication
- New project (July 2025, 4 commits)

### MCP SuperAssistant
**GitHub:** https://github.com/srbhptl39/MCP-SuperAssistant
**Firefox Extension:** https://addons.mozilla.org/en-US/firefox/addon/mcp-superassistant/

- Brings MCP to ChatGPT, DeepSeek, Perplexity, Grok, Gemini
- Sidebar overlay with parallel interaction
- 2k stars, 261 Firefox daily users
- Rating: 4.9/5 stars

### Chrome MCP Server (No Firefox Support Yet)
**GitHub:** https://github.com/hangwin/mcp-chrome

- Chrome-focused with Firefox support on roadmap
- 20+ tools including screenshots, network monitoring, bookmarks
- Semantic search with vector database
- Uses existing browser with login states
- 9.1k stars
- **Firefox support is planned but not yet available**

---

## Comparison Matrix

| Solution | Firefox Support | Full Automation | Existing Sessions | Simultaneous Interaction | Maintenance | Stars |
|----------|----------------|-----------------|-------------------|-------------------------|-------------|-------|
| **Firefox DevTools MCP** | ✅ Primary | ✅ Yes | ✅ Session mgmt | ⚠️ Limited | Very Active | 1 |
| **Browser Control MCP** | ✅ Extension | ❌ Read-only | ✅ Yes | ✅ Yes | Active | 194 |
| **Playwright MCP** | ✅ Yes | ✅ Yes | ✅ Persistent | ⚠️ Depends | Very Active | 22.7k |
| **JediLuke Firefox** | ✅ Playwright | ✅ Yes | ✅ Contexts | ⚠️ Limited | Active | 13 |
| **MCPMonkey** | ✅ Extension | ⚠️ Partial | ⚠️ Planned | ⚠️ Unknown | Active | 7 |
| **gruence/firefox-mcp** | ✅ Native | ⚠️ Limited | ❌ Unknown | ⚠️ Unknown | New | 0 |

---

## Decision Criteria

### Choose Firefox DevTools MCP if:
- You need full automation capabilities (form filling, clicking, etc.)
- You want modern WebDriver BiDi-based automation
- Network monitoring and console access are important
- You're okay with a separate Firefox instance

### Choose Browser Control MCP if:
- You need to use your existing Firefox with logged-in sessions
- You want simultaneous user interaction
- Read-only access is sufficient for your use case
- Security with user consent is a priority
- *Note: Currently has Claude Desktop compatibility issues*

### Choose Microsoft Playwright MCP if:
- You need enterprise-grade, well-maintained solution
- You want multi-browser support (not just Firefox)
- You're okay with a separate browser instance
- You need extensive automation capabilities

---

## Implementation Recommendation

**Primary Recommendation: Firefox DevTools MCP**

This provides the best balance of:
- Full automation capabilities (including form filling)
- Modern Firefox automation via WebDriver BiDi
- Active maintenance
- Session management

**Trade-off Accepted:**
- Launches separate Firefox instance instead of controlling existing browser
- User can watch the automation but not truly interact simultaneously

**Fallback Option:**
If you absolutely need to use your existing Firefox with logged-in sessions and can accept read-only limitations, use Browser Control MCP (once Claude Desktop compatibility issue is resolved).

---

## Next Steps

1. **Install Firefox DevTools MCP:**
   ```bash
   claude mcp add firefox-devtools npx firefox-devtools-mcp@latest
   ```

2. **Test basic functionality:**
   - Navigate to a page
   - Fill a form
   - Take a screenshot
   - Monitor network traffic

3. **Evaluate if it meets requirements:**
   - Test session persistence
   - Verify form filling capabilities
   - Check if automation conflicts with manual interaction

4. **If needed, try alternatives:**
   - Browser Control MCP for existing browser access
   - Playwright MCP for enterprise features

---

## References

- [Firefox DevTools MCP GitHub](https://github.com/freema/firefox-devtools-mcp)
- [Browser Control MCP GitHub](https://github.com/eyalzh/browser-control-mcp)
- [Microsoft Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
