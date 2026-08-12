---
name: gdcli
description: Google Drive CLI for listing, searching, uploading, downloading, and sharing files and folders.
---

# Google Drive CLI

Command-line interface for Google Drive operations.

## Usage

Run `gdcli --help` for full command reference.

Common operations:
- `gdcli <email> ls [folderId]` - List files/folders
- `gdcli <email> ls --query "<query>"` - List with Drive query filter
- `gdcli <email> search "<text>"` - Full-text content search
- `gdcli <email> download <fileId> [destPath]` - Download a file
- `gdcli <email> upload <localPath> [--folder <folderId>]` - Upload a file
- `gdcli <email> mkdir <name>` - Create a folder
- `gdcli <email> share <fileId> --anyone` - Share publicly

## Search

**Two different commands:**
- `search "<text>"` - Searches inside file contents (fullText)
- `ls --query "<query>"` - Filters by metadata (name, type, date, etc.)

**Use `ls --query` for filename searches!**

## Query Syntax (for ls --query)

Format: `field operator value`. Combine with `and`/`or`, group with `()`.

**Operators:** `=`, `!=`, `contains`, `<`, `>`, `<=`, `>=`

**Examples:**
```bash
# By filename
ls --query "name = 'report.pdf'"           # exact match
ls --query "name contains 'IMG'"           # prefix match

# By type
ls --query "mimeType = 'application/pdf'"
ls --query "mimeType contains 'image/'"
ls --query "mimeType = 'application/vnd.google-apps.folder'"  # folders

# By date
ls --query "modifiedTime > '2024-01-01'"

# By owner/sharing
ls --query "'me' in owners"
ls --query "sharedWithMe"

# Exclude trash
ls --query "trashed = false"

# Combined
ls --query "name contains 'report' and mimeType = 'application/pdf'"
```

Ref: https://developers.google.com/drive/api/guides/ref-search-terms
