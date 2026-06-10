---
name: pi
description: Pi documentation pointers. Use when the user asks about pi itself, its SDK, extensions, themes, skills, or TUI.
---

# Pi

The pi repo lives at `$WORKSPACE/earendil-works/pi`. Docs and examples live under the `coding-agent` package:

- Main documentation: `packages/coding-agent/README.md`
- Additional docs: `packages/coding-agent/docs/`
- Examples: `packages/coding-agent/examples/` (extensions, custom tools, SDK)

## Topic Map

| Topic | Where to read |
|---|---|
| Quickstart | `docs/quickstart.md` |
| Usage | `docs/usage.md` |
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
| RPC mode | `docs/rpc.md` |
| JSON event stream mode | `docs/json.md` |
| Sessions | `docs/sessions.md` |
| Session file format | `docs/session-format.md` |
| Compaction & branch summaries | `docs/compaction.md` |
| Containerization / sandboxing | `docs/containerization.md` |
| Pi packages | `docs/packages.md` |
| Shell aliases | `docs/shell-aliases.md` |
| Terminal setup | `docs/terminal-setup.md` |
| tmux setup | `docs/tmux.md` |
| Termux (Android) | `docs/termux.md` |
| Windows setup | `docs/windows.md` |
| Developing pi itself | `docs/development.md` |

When working on pi topics, read the docs and examples, and follow `.md` cross-references before implementing. Read pi `.md` files completely and follow links to related docs (e.g. `tui.md` for TUI API details).
