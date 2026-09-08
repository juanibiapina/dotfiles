# Instructions for pi

## Communication

Write so every sentence states a fact, a decision, or a request.

- Lead with the conclusion, then the key points, then supporting detail (Minto pyramid / bottom line up front).
- State each point directly.
- Give cost and size as a number or a concrete change.
- Keep words that each carry meaning.
- Close on the last fact or the open question.

## Development Tools

### gob

Use `gob` for servers or commands that you want to leave running to come check out later (background jobs).

usage: `gob add <command>`: runs command in background. non blocking.

`<command>` argument is not interpreted by a shell: it's a binary and args.
