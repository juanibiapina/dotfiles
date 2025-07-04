#!/usr/bin/env bash
#
# Summary: Update Claude configuration with MCP servers
#
# This is a workaround because Claude config includes a lot of unrelated bookeeping information.
# Also it includes secrets 🤦.

set -e

MCP_CONFIG="$HOME/.config/claude/mcp-servers.json"
CLAUDE_CONFIG="$HOME/.claude.json"

# Check if the dotfiles MCP config exists
if [[ ! -f "$MCP_CONFIG" ]]; then
    echo "Error: MCP servers config not found at $MCP_CONFIG"
    exit 1
fi

# Check if Claude config exists
if [[ ! -f "$CLAUDE_CONFIG" ]]; then
    echo "Error: Claude config not found at $CLAUDE_CONFIG"
    exit 1
fi

# Read the MCP servers configuration and substitute environment variables
MCP_SERVERS=$(cat "$MCP_CONFIG" | envsubst)

# Create a backup of the current Claude config
cp "$CLAUDE_CONFIG" "$CLAUDE_CONFIG.backup"

# Update the Claude config by completely replacing the mcpServers section
jq --argjson mcpServers "$MCP_SERVERS" '.mcpServers = $mcpServers' "$CLAUDE_CONFIG" > "$CLAUDE_CONFIG.tmp"

# Replace the original file
mv "$CLAUDE_CONFIG.tmp" "$CLAUDE_CONFIG"

echo "✓ Updated Claude MCP servers configuration from dotfiles"
