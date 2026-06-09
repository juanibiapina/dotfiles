---
name: gh-notifications
description: >
  Use when working with GitHub notifications.
---

# GitHub Notifications

## API Endpoints

### Listing

```bash
gh api /notifications --paginate                          # all unread
gh api /notifications?participating=true --paginate       # only participating
gh api /notifications?all=true --paginate                 # include already-read
gh api /notifications?since=2025-01-01T00:00:00Z          # since timestamp
```

Compact projection:

```bash
gh api /notifications --paginate \
  -q '.[] | {id: .id, type: .subject.type, reason: .reason, title: .subject.title, repo: .repository.full_name, subject_url: .subject.url}'
```

### Thread Actions

Three distinct operations:

| Action | Method | Effect |
|---|---|---|
| Mark as **read** | `gh api -X PATCH /notifications/threads/{id}` | Marks read, still visible in inbox |
| Mark as **done** | `gh api -X DELETE /notifications/threads/{id}` | Removes from inbox entirely (like web UI "Done" button) |
| **Unsubscribe** | `gh api -X DELETE /notifications/threads/{id}/subscription` | Stops future notifications for that thread |

There is no bulk "mark as done." Must DELETE each thread individually.

Never use mark as read. It leaves notifications in the inbox and solves nothing. Always mark as done.

Never use `PUT /notifications` either. It marks ALL notifications as read (not done).
