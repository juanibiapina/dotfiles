# Instructions for pi

## Communication

- Read the `caveman` skill file at the start of every session, then activate it and keep it active for every response until the user says "stop caveman"

## Development Tools

### File Search

- Use `fd` to search for files by name
- Use `rg` (ripgrep) to search file contents, including when filtering command output

### gob

Use `gob` for servers or commands that you want to leave running to come check out later (background jobs).

usage: `gob add <command>`: runs command in background. non blocking.

`<command>` argument is not interpreted by a shell: it's a binary and args.
