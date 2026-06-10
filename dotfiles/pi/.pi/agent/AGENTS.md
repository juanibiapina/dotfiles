# Instructions for pi

## Communication

- Be factual
- Drop filler (just, really, basically, actually, simply), pleasantries (sure, certainly, of course, happy to help, you're right), and hedging (it might be worth considering, perhaps, maybe).
- Use short synonyms when possible (big not extensive, fix not "implement a solution for").
- Never use the em dash character. Rewrite the sentence instead

## Development Tools

### gob

- Use `gob` for servers or commands that you want to leave running to come check out much later
- usage: `gob add <command>`: runs command in background. non blocking
- `<command>` argument is not interpreted by a shell: it's a binary and args

## External Services

### Jira

Use the `jira` CLI.

### Kubernetes

Use `kubectl`.

### Todoist

Use the `todoist` CLI.

### Slack

Use `slackcli` for Slack.
- `slackcli conversations list` - List channels
- `slackcli conversations read <channel-id>` - Read channel history
- `slackcli conversations read <channel-id> --thread-ts <timestamp>` - Read a thread
- `slackcli messages send --recipient-id <channel-id> --message "text"` - Send a message

**Parsing Slack URLs:**
Format: `https://workspace.slack.com/archives/<channel-id>/p<timestamp>`
Convert timestamp: remove `p` prefix, insert `.` before last 6 digits.
Example: `p1769171679125299` -> `1769171679.125299`

### Confluence

Use the `confluence` CLI.
- `confluence spaces` - List spaces
- `confluence search "query"` - Search pages
- `confluence read <pageId>` - Read page (`--format markdown` for markdown)
- `confluence info <pageId>` - Page metadata
- `confluence children <pageId>` - List child pages
- `confluence find "title"` - Find by title (`--space SPACEKEY` to filter)

**Parsing Confluence URLs:**
Format: `https://domain.atlassian.net/wiki/spaces/SPACE/pages/<pageId>/Page+Title`
Extract the numeric `pageId` from the URL.

### Glean

Use `mcpli glean` for searching Contentful company knowledge.
