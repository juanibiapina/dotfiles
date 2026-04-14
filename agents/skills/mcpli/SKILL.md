---
name: mcpli
description: CLI tool for interacting with MCP (Model Context Protocol) servers. Use when invoking MCP tools, managing MCP servers, or working with MCP-based APIs. Triggers on "MCP server", "mcpli", "invoke MCP tool", or any MCP server interaction.
---

# mcpli

Use `mcpli` to add MCP servers, inspect tools, and call them.

## Core commands

```bash
mcpli add <name> <url> [--header "key: value"]...
mcpli list
mcpli list <server>
mcpli <server> --help
mcpli <server> <tool> --help
mcpli <server> <tool> '{"key":"value"}'
mcpli update <server>
mcpli remove <server>
```

## Notes

- Headers support environment variables like `${API_TOKEN}`.
- Tool definitions are cached locally. Run `update` to refresh.
- Config lives at `~/.config/mcpli/config.json`.
- Tool arguments must be valid JSON.
