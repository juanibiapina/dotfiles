---
description: Check real estate listings for the house search project
---

# Check Listings

Evaluate a Berlin real estate listing.

## Setup

- Read `$NOTES_VAULT/Buy a House.md` first for requirements and prior decisions.

## Input

$ARGUMENTS

If no URL is given, find candidate emails:
```bash
gws gmail +triage --query "in:inbox"
```
Read threads as needed:
```bash
gws gmail users threads get --params '{"userId": "me", "id": "<threadId>"}'
```
Extract the listing URL from the email.

## Workflow

1. Check whether the URL is already listed under Rejected, Potentially Interesting, or Pending Evaluation.
2. Open the listing and extract the key facts: price, rooms, area, location, year built, energy class.
3. Compare it against the requirements note.
4. Add it to `## Pending Evaluation` using the existing note format.
5. Summarize it and ask for a decision:
   - `interesting`
   - `rejected`
   - `contact`
6. If it came from email, label the thread and remove `UNREAD` and `INBOX`.

Process one listing at a time.
