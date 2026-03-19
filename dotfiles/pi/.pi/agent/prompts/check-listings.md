---
description: Check real estate listings for the house search project
---

# Check Listings

Evaluate real estate listings for the house search in Berlin.

## Setup

- Note: `$NOTES_VAULT/Buy a House.md`
- Read the note first to get current requirements and existing listings

## Input

$ARGUMENTS

If a URL is provided above, use it. Otherwise search email:
```bash
gws gmail +triage --query "in:inbox"
```
Then read specific threads to extract listing URLs:
```bash
gws gmail users threads get --params '{"userId": "me", "id": "<threadId>"}'
```
Look for house/apartment listing emails. Extract URLs from email content.

## Workflow

### 1. Check for duplicates

Search the note for the URL in:
- "Rejected Listings" → skip
- "Potentially Interesting Listings" → skip
- "Pending Evaluation" → skip

### 2. Process listing

```bash
browse tab.new "<url>"
browse page.text
```

Extract key details (price, rooms, area, location, year built, energy class) and translate to English.

### 3. Evaluate against requirements

Compare listing against the `## Requirements` section in Buy a House.md.

### 4. Save to Pending Evaluation

Add listing under `## Pending Evaluation` in Buy a House.md using the same format as "Potentially Interesting Listings".

### 5. Present for decision

Leave browser tab open. Summarize and ask for decision:
- **interesting** → move to "Potentially Interesting Listings"
- **rejected** → move to "Rejected Listings" with reason
- **contact** → move to "Potentially Interesting Listings", mark contacted

Process one listing at a time. Wait for decision before next.

### 6. Manage email

After processing a listing from email, find the "House Search" label ID, then modify each message in the thread:
```bash
gws gmail users labels list --params '{"userId": "me"}' --format json
gws gmail users messages modify --params '{"userId": "me", "id": "<messageId>"}' --json '{"addLabelIds": ["<HOUSE_SEARCH_LABEL_ID>"], "removeLabelIds": ["UNREAD", "INBOX"]}'
```
