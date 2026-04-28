---
name: pi
description: Pi documentation pointers. Use when the user asks about pi itself, its SDK, extensions, themes, skills, or TUI.
---

# Pi

The pi-mono repo lives at `$WORKSPACE/badlogic/pi-mono`. Docs and examples live under the `coding-agent` package:

- Main documentation: `packages/coding-agent/README.md`
- Additional docs: `packages/coding-agent/docs/`
- Examples: `packages/coding-agent/examples/` (extensions, custom tools, SDK)

## Topic Map

| Topic | Where to read |
|---|---|
| Extensions | `docs/extensions.md`, `examples/extensions/` |
| Themes | `docs/themes.md` |
| Skills | `docs/skills.md` |
| Prompt templates | `docs/prompt-templates.md` |
| TUI components | `docs/tui.md` |
| Keybindings | `docs/keybindings.md` |
| SDK integrations | `docs/sdk.md` |
| Custom providers | `docs/custom-provider.md` |
| Adding models | `docs/models.md` |
| Pi packages | `docs/packages.md` |

When working on pi topics, read the docs and examples, and follow `.md` cross-references before implementing. Read pi `.md` files completely and follow links to related docs (e.g. `tui.md` for TUI API details).
