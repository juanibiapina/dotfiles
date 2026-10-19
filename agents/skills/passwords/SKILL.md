---
name: passwords
description: Fills passwords, usernames, and one-time codes from the user's KeePass database into commands through `kp exec` and `kp://` references, so no secret enters the conversation. Use when a site or command needs a login, password, credential, or 2FA/OTP code, when browsing reaches a sign-in page, or when the user says "log in", "sign in", or "use my password".
---

# Passwords

Secrets reach commands only through `kp`. The conversation carries `kp://` references; `kp exec` replaces each one with its real value after the shell has parsed the command, runs the command directly, and replaces those values in its output with `[secret]`. The transcript is stored and sent to the model provider, so a reference is the only form of a secret it should ever hold.

## Find and check the entry

`kp find <term>` lists matching entry paths. `kp check <ref>` confirms a reference resolves and prints only its length and a hash prefix; use it to tell a wrong entry or empty field from a site problem. If no entry fits, ask the user to add one in KeePassXC and tell you its name.

## Fill

Pass each reference as a whole argument, quoted if the entry path has spaces:

- `kp://<entry>`: password
- `kp://<entry>#UserName`: username
- `kp://<entry>#totp`: current one-time code
- `kp://<entry>#<Attribute>`: any other KeePass attribute

<example>
kp exec -- browse type kp://Web/GitHub#UserName --ref e11
kp exec -- browse type kp://Web/GitHub --ref e12 --submit
kp exec -- browse type kp://Web/GitHub#totp --ref e20 --submit
kp exec -- chrome-devtools fill 1 input-uid-456 kp://Web/GitHub
</example>

With Chrome DevTools, drive the whole session through the `chrome-devtools` CLI: MCP calls cannot be wrapped, and the CLI runs its own browser daemon, so mixing the two fills a different browser.

## After filling

- Confirm the login with a page read or URL check. Login request bodies and console output carry the raw value, and `kp` only scrubs the command it wraps.
- Fill secrets only into password, username, and OTP fields; screenshots show text fields in clear.
- If a fill does not take, run `kp check` on the reference, report the result to the user, and stop.

Leave `PASSWORD`, `KP_DB`, and `keepassxc-cli` to `kp`: printing them puts the master password, the database location, or a secret in the transcript, and that cannot be undone.
