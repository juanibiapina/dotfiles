---
name: gws
description: Google Workspace CLI for Gmail, Drive, Sheets, and Calendar. Use when sending/searching/reading email, uploading/listing/downloading/deleting files, reading/writing spreadsheets, viewing agenda, creating/deleting calendar events, or any Google Workspace task. Triggers on "email", "gmail", "send email", "calendar", "agenda", "schedule", "drive", "upload file", "sheets", "spreadsheet", "Google Workspace", "gws", or any email/calendar/drive/sheets request.
---

# Google Workspace CLI (gws)

Unified CLI for Gmail, Drive, Sheets, and Calendar APIs. Only these four services are authorized.

## Authentication

If auth fails, re-login with `gws auth login`. This starts a local HTTP server and prints a browser URL. Since it blocks waiting for the OAuth callback, run it in the background with `gob add gws auth login`, then retrieve the URL from `gob logs <job_id>` and present it to the user.

## General Pattern

```bash
gws <service> <resource> <method> --params '<JSON>' --json '<JSON>'
gws <service> +helper [flags]
```

Common flags: `--format table|json|yaml|csv`, `--page-all` (auto-paginate), `--dry-run`, `--output <path>` (binary downloads).

Use `gws schema <service.resource.method>` to discover parameters for any API method.

## Gmail

### Helpers

```bash
# Send
gws gmail +send --to alice@example.com --subject 'Hello' --body 'Hi Alice!'
gws gmail +send --to alice@example.com --subject 'Hey' --body 'Hi!' --cc bob@example.com --bcc secret@example.com

# Triage (read-only inbox summary)
gws gmail +triage
gws gmail +triage --max 5 --query 'from:boss is:unread'
gws gmail +triage --format table --labels

# Reply / Reply-all
gws gmail +reply --message-id 18f1a2b3c4d --body 'Thanks!'
gws gmail +reply-all --message-id 18f1a2b3c4d --body 'Noted, thanks everyone'

# Forward
gws gmail +forward --message-id 18f1a2b3c4d --to dave@example.com --body 'FYI see below'
```

### Raw API

```bash
# List messages
gws gmail users messages list --params '{"userId": "me", "q": "from:alice is:unread", "maxResults": 10}'

# Get message
gws gmail users messages get --params '{"userId": "me", "id": "MSG_ID", "format": "full"}'

# Modify labels
gws gmail users messages modify --params '{"userId": "me", "id": "MSG_ID"}' --json '{"addLabelIds": ["UNREAD"], "removeLabelIds": ["INBOX"]}'

# List labels
gws gmail users labels list --params '{"userId": "me"}'
```

### Gmail Search Syntax

Used in `+triage --query` and raw API `q` parameter:
- `from:alice@example.com` / `to:bob@example.com`
- `subject:invoice`
- `is:unread` / `is:starred` / `is:important`
- `has:attachment`
- `label:work`
- `after:2026/01/01` / `before:2026/03/01`
- `newer_than:2d` / `older_than:1w`
- Combine with spaces (AND) or `OR`: `from:alice subject:report`

## Drive

### Helpers

```bash
# Upload
gws drive +upload ./report.pdf
gws drive +upload ./report.pdf --parent FOLDER_ID --name 'Q1 Report.pdf'
```

### Raw API

```bash
# List files
gws drive files list --params '{"q": "name contains '\''report'\''", "pageSize": 10, "fields": "files(id,name,mimeType,modifiedTime)"}'

# Get file metadata
gws drive files get --params '{"fileId": "FILE_ID", "fields": "id,name,mimeType,size,webViewLink"}'

# Download file
gws drive files get --params '{"fileId": "FILE_ID", "alt": "media"}' --output ./downloaded.pdf

# Delete file
gws drive files delete --params '{"fileId": "FILE_ID"}'

# Create folder
gws drive files create --json '{"name": "New Folder", "mimeType": "application/vnd.google-apps.folder"}'
```

### Drive Query Syntax

Used in `q` parameter of `files list`:
- `name contains 'budget'` / `name = 'exact.txt'`
- `mimeType = 'application/pdf'`
- `mimeType = 'application/vnd.google-apps.folder'` (folders)
- `modifiedTime > '2026-01-01T00:00:00'`
- `'FOLDER_ID' in parents` (files in folder)
- `trashed = false`
- Combine with `and` / `or`: `name contains 'report' and mimeType = 'application/pdf'`

## Sheets

### Raw API

```bash
# Get spreadsheet metadata (lists sheet names and IDs)
gws sheets spreadsheets get --params '{"spreadsheetId": "SPREADSHEET_ID", "fields": "spreadsheetId,properties.title,sheets(properties(sheetId,title))"}'

# Read values from a range
gws sheets spreadsheets values get --params '{"spreadsheetId": "SPREADSHEET_ID", "range": "Sheet1!A1:E10"}'

# Read multiple ranges at once
gws sheets spreadsheets values batchGet --params '{"spreadsheetId": "SPREADSHEET_ID", "ranges": ["Sheet1!A1:E10", "Sheet2!A1:C5"]}'

# Write values to a range (overwrite)
gws sheets spreadsheets values update --params '{"spreadsheetId": "SPREADSHEET_ID", "range": "Sheet1!A1", "valueInputOption": "USER_ENTERED"}' --json '{"values": [["Name", "Score"], ["Alice", 95], ["Bob", 87]]}'

# Append rows to end of table
gws sheets spreadsheets values append --params '{"spreadsheetId": "SPREADSHEET_ID", "range": "Sheet1!A:E", "valueInputOption": "USER_ENTERED"}' --json '{"values": [["Charlie", 92], ["Dana", 88]]}'

# Clear values (keeps formatting)
gws sheets spreadsheets values clear --params '{"spreadsheetId": "SPREADSHEET_ID", "range": "Sheet1!A1:E10"}'

# Create a new spreadsheet
gws sheets spreadsheets create --json '{"properties": {"title": "My New Spreadsheet"}}'
```

### Parsing Spreadsheet URLs

URL format: `https://docs.google.com/spreadsheets/d/{spreadsheetId}/edit?gid={sheetId}`

Extract `spreadsheetId` (the long string between `/d/` and `/edit`) for API calls. The `gid` parameter is the numeric sheet ID (tab within the spreadsheet) — use the metadata endpoint to map `gid` values to sheet names.

## Calendar

### Helpers

```bash
# View agenda
gws calendar +agenda --today
gws calendar +agenda --week --format table
gws calendar +agenda --days 3 --calendar 'Work'

# Create event (times in RFC 3339)
gws calendar +insert --summary 'Standup' --start '2026-03-11T09:00:00+01:00' --end '2026-03-11T09:30:00+01:00'
gws calendar +insert --summary 'Review' --start '...' --end '...' --attendee alice@example.com --location 'Room 5'
```

### Raw API

```bash
# List events
gws calendar events list --params '{"calendarId": "primary", "timeMin": "2026-03-11T00:00:00Z", "timeMax": "2026-03-12T00:00:00Z", "singleEvents": true, "orderBy": "startTime"}'

# Delete event
gws calendar events delete --params '{"calendarId": "primary", "eventId": "EVENT_ID"}'

# Check availability
gws calendar freebusy query --json '{"timeMin": "2026-03-11T00:00:00Z", "timeMax": "2026-03-12T00:00:00Z", "items": [{"id": "primary"}]}'
```

### Calendar Date Format

All times use RFC 3339: `2026-03-11T09:00:00+01:00` or `2026-03-11T09:00:00Z` (UTC).

## Tips

- Use `gws schema <method>` to discover all parameters (e.g., `gws schema gmail.users.messages.list`)
- Use `--page-all` to auto-paginate large result sets (NDJSON, one JSON object per page)
- Use `--dry-run` to preview any request without executing it
- Use `--format table` for human-readable output
- For HTML emails or attachments, use the raw `gws gmail users messages send` API instead of `+send`
- The authenticated user's email is in `$EMAIL`; use `"userId": "me"` for Gmail API calls
- Use `gws schema sheets.spreadsheets.*` to discover Sheets API methods and parameters
- Sheet names with spaces must be quoted in A1 notation: `'My Sheet'!A1:E10`
