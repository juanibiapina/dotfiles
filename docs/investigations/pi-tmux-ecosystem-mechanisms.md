# pi-tmux ecosystem: mechanisms and implementation ideas

## Conclusion

The `pi-tmux-*` ecosystem splits into two architectural styles and a dozen
reusable mechanisms. For our goal (show agent state per tmux window, plus
notifications and navigation), the strongest ideas to adopt are: **pane-level
state option + window rollup** (not a window-level option), a **`blocked`
/needs-you state** detected from tool events, **idle debounce**, a
**status-interval self-heal heartbeat** for states events cannot clear, and for
notifications, **OSC 9/777/99 desktop notifications through tmux DCS passthrough
with click-to-return via a one-shot `client-focus-in` hook**. Two projects are
near-exact prior art: `Gentleman-Programming/gentle-agent-state` (state in the
tab bar, shell-driven) and `yuki-kisaku/pi-agent-status` (npm `pi-tmux`,
TS-driven, adds spinner + OSC title + LLM naming).

Source: 14 repos cloned to `/tmp/pi-tmux-research`, read Dec 2026. Catalog:
`https://pi.dev/packages?name=pi-tmux`.

## The two architectural styles

- **Shell-driven** (`gentle-agent-state`): a thin pi adapter `spawn`s a neutral
  shell script; all state lives in tmux options; heavy self-heal via tmux hooks
  and the status-interval. Cross-tool (opencode/claude/codex/pi) through a
  canonical vocabulary and an anti-corruption core script. Multi-agent aware.
- **TS in-process** (`pi-agent-status`, `pi-tmux-session-map`, `@qianweiyang/pi-tmux`,
  `pi-tmux-subagents`): everything runs inside the extension; richer features
  (animated spinner, LLM naming, JSON sidecar files, in-pi TUI widgets),
  per-extension settings commands. Usually single-agent focused.

Our current `pi-live` (files/socket publisher) + proposed `pi-tmux` (display
adapter) matches the TS in-process style, with a filesystem interface like
`pi-tmux-session-map`.

## Mechanisms by concern

### 1. State source — pi lifecycle → canonical state

Common mapping across all: `session_start`→idle, `agent_start`→working,
`agent_end`/`agent_settled`→idle. Refinements:

- **Idle debounce** (`gentle`): on `agent_end`, wait ~250ms before reporting
  idle, so provider retries and back-to-back turns do not flash idle. Timer
  `unref`'d.
- **Richer terminal states from `stopReason`** (`pi-tmux-session-map`): map
  `agent_end` message `stopReason` → `error`→retrying (provisional),
  `aborted`→cancelled, `length`→incomplete, else done; confirm final on
  `agent_settled` (failed if recovery did not succeed). Taxonomy: idle, working,
  retrying, done, cancelled, incomplete, failed, shutdown.
- **`blocked` / needs-you state** (`gentle`, `@qianweiyang/pi-tmux`): pi has no
  "waiting on user" lifecycle event, so infer it from tool events. On
  `tool_execution_start`/`tool_call`, if the (normalized) tool name is a blocking
  prompt (`ask_user_question`, `request_user_input`, `exit_plan_mode`, `confirm`)
  — or a *guarded* bash command (git push, rm -rf, npm publish, git reset --hard,
  …) — report `blocked`; clear on `tool_result`/`tool_execution_end` by tracked
  `toolCallId`. This is the highest-value signal: "which agent needs me."

### 2. State storage in tmux — pane option + window rollup

- **Pane-level option** (`gentle`): `tmux set -p -t <pane> @agent_state <state>`.
  Auto-removed when the pane dies — **no shutdown cleanup needed**. Superior to a
  window-level option (which needs manual unset and breaks with multiple panes).
- **Window rollup** (`gentle`): compute the worst state across the window's panes
  (`blocked > working > idle`) by iterating `list-panes -t <win> -F
  '#{@agent_state}'`, store in `tmux set -w -t <win> @win_agent_state`. The
  window-status-format reads the rollup, so N agents in one window resolve
  correctly. (Our current plan's "last writer wins" is the weaker choice.)
- **Window-level option, direct** (`pi-agent-status`): `setWindowWorking(win,
  bool)` — simpler, single-agent.
- **Read the option per window in a format**: `#{@win_agent_state}` resolves each
  window's own value in `window-status-format` (verified independently in our own
  tmux). Conditional glyph: `#{?#{==:#{@win_agent_state},blocked},x,#{?#{==:...,working},o,}}`.

### 3. Rendering the state

- **Tab-bar glyph** (`gentle`): extend the theme's `window-status-format` /
  `window-status-current-format` with a coloured `x` (blocked, red) / `o`
  (working, orange) / nothing (idle). Install file is *sourced after* the theme
  so it extends rather than gets clobbered.
- **OSC terminal title** (`pi-agent-status`, `yuki-kisaku` core): set the outer
  terminal title with OSC so a collapsed tmux session still shows activity in the
  host terminal tab; strip/append a suffix marker.
- **Animated spinner** (`pi-agent-status`): a JS `setTimeout` loop (~500ms) writes
  successive spinner frames into the window name / terminal title while any window
  in the session is busy. Configurable style/speed. Stops and restores on idle.

### 4. State cleanup and self-heal

Events miss some transitions (a user *cancels* an agent prompt → no event → the
`blocked` state would stick). Three complementary heals (`gentle`):

- **Pane-death auto-clean**: pane-level options vanish with the pane.
- **Status-interval heartbeat**: a silent script prepended to `status-right` (the
  only thing tmux re-runs every `status-interval`) clears `blocked` on panes in
  the currently-viewed window each refresh. Re-applied on `client-attached`
  because async TPM themes clobber `status-right`. Idempotent prepend.
- **Navigation hooks**: `after-select-window`, `after-select-pane`,
  `pane-focus-in`, `client-session-changed` run the same heal instantly when you
  look at an agent — theme-independent.

### 5. Notifications

- **Terminal BEL** (`pi-tmux-bell`): write `\x07` on `turn_end`/`agent_end`;
  relies on tmux `monitor-bell` + `visual-bell`/bell-style. Cheapest possible.
- **Desktop notifications** (`pi-tmux-notify`): auto-detect protocol — OSC 99
  (Kitty), OSC 777 (Ghostty/WezTerm/iTerm2), OSC 9 (fallback). Build the escape
  sequence, and **inside tmux wrap it in DCS passthrough**
  (`\x1bPtmux;<seq-with-ESC-doubled>\x1b\\`) so background panes can emit it;
  requires `set -g allow-passthrough all` (the extension warns once if off).
  Write to the pane TTY.
- **Click-to-return** (`pi-tmux-notify`): on notify, arm a one-shot global
  `client-focus-in[777]` hook whose `run-shell` does `switch-client +
  select-window + select-pane + set-hook -gu` (self-removing). Clicking the
  desktop notification focuses the terminal → focus-in fires → tmux jumps to the
  exact pane. Disarmed when the user types instead. Caveat: OSC clicks carry no
  identity, so with multiple pending agents any click returns to the most recent.
- **Visibility gating** (`gentle`, `pi-tmux-notify`, our `notify.ts`): only
  sound/notify when the pane is *not* on-screen —
  `#{&&:#{pane_active},#{&&:#{window_active},#{session_attached}}}`.
- **Cross-platform sound** (`gentle`): best-effort `afplay`/`paplay`/
  `canberra-gtk-play`/`aplay`, per transition, never required.
- **Completion mark with auto-clear** (`pi-agent-status`): set a mark on
  `agent_end`; if the window is focused, auto-clear it after N ms; otherwise a
  poll watches until seen.

### 6. Identity and discovery (filesystem sidecars)

- **Stable pane key** (`pi-tmux-session-map`):
  `#{session_name}:#{window_index}.#{pane_index}` — survives `tmux kill-server`,
  unlike pane ids (`%42`). Filenames = sanitized prefix + 12-char SHA-256 suffix
  (collision-safe, filename-length-safe). Enables exact per-pane session resume
  with tmux-resurrect (vs blind `pi --continue` picking the newest session for
  the cwd).
- **Window-id resolution from pane** (`pi-tmux-window-name`, `pi-tmux-notify`,
  our runtime): `display-message -p -t $TMUX_PANE '#{window_id}'`. `window_id`
  (`@N`) is stable within a server and the right rename/option target.
- **Atomic writes + serialization** (`pi-tmux-session-map`, `pi-tmux-subagents`,
  `@qianweiyang/pi-tmux`): write to `<file>.<pid>.<rand>.tmp` then `rename`; an
  async queue or `mkdir` lock serializes concurrent writes; throttled error
  reporting; opportunistic cleanup of stale/superseded/temp files. Mappings kept
  across shutdown (must survive kill-server); overwritten per start (self-heal).
  (This matches our `pi-live` status-store design — validation that we are on the
  right track, plus the async-queue/lock refinement.)
- **Trigger file** (`pi-tmux-session-map`): `touch` an `agent.trigger` after a
  status write so a polling consumer refreshes within one tick — a poor-man's
  push signal.
- **State record shape** (`@qianweiyang/pi-tmux`): version, name, state
  (idle|working|blocked|done|exited), activity, generation, incarnation, pid,
  paneId, sessionId, sessionFile, updatedAt — close to our `PiSessionStatus`.

### 7. Navigation and viewing

- **In-pi TUI widget** (`pi-tmux-subagents`): a `@earendil-works/pi-tui` widget
  renders a live agent list inside pi — glyph + name + detail + age + cost, sorted
  by group (needsInput/error/working/done), width-aware truncation, age
  auto-refresh timer. A sidebar *inside the agent*, not a tmux pane.
- **External tmux popup radar** (`bnomei/ilmari`, Rust, not pi-specific): scans
  existing tmux panes, detects agent CLIs, groups by workspace, shows state +
  recent output, jumps to the selected pane. Observer-only. Optional per-server
  collector daemon publishing tmux badge fragments + a Unix/MCP socket.
- **`capture-pane`** (`pi-tmux-subagents`, `@romansix/pi-tmux`, `ilmari`):
  `capture-pane -p -t <target> -S -200` to read an agent's recent output for a
  peek/preview without switching to it.

### 8. Message injection between agents/panes

- **Buffer paste** (`pi-tmux-subagents`): `set-buffer -b <name> -- <msg>` then
  `paste-buffer -p -r -b <name> -t <target>` then `send-keys -t <target> Enter`,
  then `delete-buffer`. Bracketed paste (`-p`) handles multi-line safely — more
  robust than `send-keys -l`.
- Our `send_pi_message` uses a Unix socket instead (pi-live) — a cleaner channel
  when both ends are pi, but the buffer-paste trick works for any pane.

### 9. Window/session naming

- **LLM-generated titles** (`pi-tmux-window-name`, `pi-agent-status`): on the
  first user prompt (`before_agent_start`), call a small completion to produce a
  short window title (3-4 words) and a longer session name (8-12 words);
  normalize (strip punctuation, keep alnum, sentence case); deterministic
  fallback on failure. Configurable model. `/rename` recomputes from the
  conversation. Persist the short title in a custom `SessionEntry` for restore on
  `session_start`.
- **Robust rename target**: rename by resolved `window_id`, guarded by `$TMUX`
  and `$TMUX_PANE`.

### 10. Session lifecycle helpers

- **Launch** (`pi-tmux-subagents`, `@romansix/pi-tmux`): `new-session -d`,
  `new-window`, or `split-window`; env passed via `-e`/quoted `env`; `has-session`
  guard; `openTerminalTab` attaches from iTerm2/Terminal/kitty/ghostty/WezTerm.
- **Fork with cache reuse** (`pi-tmux-fork`): fork copies the parent conversation
  byte-for-byte so the LLM prompt prefix is identical, hitting implicit prompt
  caches (e.g. GLM); opens the child in a new window or split; optional git
  worktree (a `cwd-cache-fixer` repairs cache when cwd changes). Config in
  `settings.json` (`tmuxFork.mode`, `closeOnExit`).
- **Resurrection** (`pi-tmux-session-map`): pair with tmux-resurrect + a
  `pi-tmux-resume` wrapper keyed on the stable pane key.

### 11. Subagent / child guards

- Disable display/naming in children: `PI_SUBAGENT_CHILD`, `HERDR_ENV`,
  `PI_TMUX_WINDOW_NAME_DISABLED`, or an `isMainAgentSession(ctx)` check. Prevents
  child agents from renaming windows or double-reporting state.

### 12. Cross-cutting architecture patterns

- **Anti-corruption core** (`gentle`): every agent adapter maps to one canonical
  vocabulary and calls one core; agent-specific quirks stay in thin adapters.
- **Settings command** (`pi-agent-status`): a `/pi-tmux` command with typed specs
  (boolean/enum/string), persisted, with `onChange` re-wiring live (e.g. restart
  the spinner). Good model if our `pi-tmux` grows options.
- **In-flight dedup** (`pi-agent-status`): cache the resolved `window_id` and
  dedup concurrent resolves with a shared promise.
- **Monorepo shared core** (`yuki-kisaku/pi-agent-status`, `aliaksei/pi-packages`,
  `schuettc/pi-extensions`): `packages/core` shared by `pi-tmux`, `pi-herdr`,
  `pi-orca` backends. If we generalize beyond tmux later.

## Implications for our `pi-tmux` extension

Ranked, relative to the current plan (`docs/plans/pi-tmux-extension.md`):

1. **Switch to pane-level `@state` + window rollup** instead of a window-level
   `@pi_state`. Fixes multi-pane correctness and removes shutdown cleanup (panes
   auto-clean). This is the single biggest correctness upgrade.
2. **Add a `blocked` state** from blocking-tool detection — the "needs you"
   signal is more useful than working/idle alone, and it unifies with our
   existing notification queue.
3. **Debounce idle** (~250ms) to stop flicker on retries/back-to-back turns.
4. **Add a status-interval self-heal** for `blocked` (and nav hooks), since no
   event fires when a user cancels a prompt.
5. **Notifications**: our `notify.ts` is BEL-queue style; consider OSC desktop
   notifications via DCS passthrough + one-shot `client-focus-in` return, gated
   by visibility, for parity with `pi-tmux-notify`.
6. **Keep the socket** for agent↔agent messaging (cleaner than buffer-paste), but
   note buffer-paste as the any-pane fallback.
7. Defer LLM naming, spinner, and resurrection unless wanted; they are additive
   and well-scoped.

## Repo index (cloned)

State/tab-bar: `Gentleman-Programming/gentle-agent-state`,
`yuki-kisaku/pi-agent-status` (npm `pi-tmux`), `@qianweiyang/pi-tmux`
(`JokerQianwei/pi-tmux`). Naming: `default-anton/pi-tmux-window-name`.
Notify: `cuongvd23/pi-tmux-notify`, `satyam-mishra-pce/pi-tmux-bell`.
Identity/resurrect: `patlux/pi-tmux-session-map`. Orchestration/subagents:
`masta-g3/pi-tmux-subagents`, `revazi/pi-tmux-orchestrator`,
`edxeth/pi-subagents`. Bash-in-tmux: `Snowy117/pi-tmux-bash`,
`aliaksei-raketski/pi-packages`, `@romansix/pi-tmux` (indigoviolet). Fork:
`geeyu/tmux-fork`. Side-chat: `snehalyelmati/pi-tmux-sidechat`. Images:
`safurrier/pi-tmux-images`. Bridge: `schuettc/pi-extensions`. Radar (non-pi):
`bnomei/ilmari`.
