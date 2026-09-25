---
name: pi
description: Pi documentation pointers. Use when the user asks about pi itself, its SDK, extensions, themes, skills, or TUI.
---

# Pi

The pi repo lives at `$WORKSPACE/earendil-works/pi`. Docs and examples live under the `coding-agent` package:

- Main documentation: `packages/coding-agent/README.md`
- Additional docs: `packages/coding-agent/docs/`
- Examples: `packages/coding-agent/examples/` (extensions, custom tools, SDK)

Resolve `docs/...` and `examples/...` under `packages/coding-agent/` in that checkout, not under the current working directory.

## Topic Map

| Topic | Where to read |
|---|---|
| Quickstart | `docs/quickstart.md` |
| Usage | `docs/usage.md` |
| Configuration and prompt files | `docs/configuration.md` |
| CLI and output modes | `docs/cli.md`, `docs/cli-integration.md` |
| Environment variables | `docs/environment-variables.md` |
| How Pi works | `docs/how-pi-works.md` |
| Settings | `docs/settings.md` |
| Providers (OAuth / API key) | `docs/providers.md` |
| Custom providers | `docs/custom-provider.md` |
| Adding models | `docs/models.md` |
| Extensions | `docs/extensions.md`, `examples/extensions/` |
| Prompt templates | `docs/prompt-templates.md` |
| Skills | `docs/skills.md` |
| Themes | `docs/themes.md` |
| TUI components | `docs/tui.md` |
| Keybindings | `docs/keybindings.md` |
| SDK integrations | `docs/sdk.md` |
| Slash commands | `docs/slash-commands.md` |
| RPC mode | `docs/rpc.md`, `docs/rpc-commands.md`, `docs/rpc-extension-ui.md` |
| JSON event stream mode | `docs/json.md` |
| Sessions | `docs/sessions.md` |
| Session file format and message types | `docs/session-format.md`, `docs/message-types.md` |
| Compaction & branch summaries | `docs/compaction.md` |
| Containerization / sandboxing | `docs/containerization.md` |
| Pi packages | `docs/packages.md` |
| Shell aliases | `docs/shell-aliases.md` |
| Terminal setup | `docs/terminal-setup.md` |
| tmux setup | `docs/tmux.md` |
| Termux (Android) | `docs/termux.md` |
| Windows setup | `docs/windows.md` |
| Developing Pi itself | `packages/coding-agent/README.md` (Development), root `CONTRIBUTING.md` and `AGENTS.md` |

When asked for the current model, provider, reasoning level, or session, inspect `PI_MODEL`, `PI_PROVIDER`, `PI_REASONING_LEVEL`, `PI_SESSION_ID`, and `PI_SESSION_FILE` through the LLM-callable Bash tool instead of inferring them from the prompt. See `docs/environment-variables.md`; user-entered `!` commands do not receive this session metadata.

When working on Pi topics, read the docs and examples, and follow `.md` cross-references before implementing. Read Pi `.md` files completely and follow links to related docs (e.g. `tui.md` for TUI API details).
