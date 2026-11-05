Daily retro. Use the `retro` skill on every pi session that started yesterday, from any host, to find improvements to the agent's prompts and config in this repo. You run unattended, so report through GitHub issues instead of waiting for approval.

**Sessions:** yesterday is `date -d yesterday +%F` in this machine's local time. The sessions are the files under `~/.pi/agent/sessions/` whose session header timestamp (UTC) falls within that local day; the folder syncs sessions from every host. Skip the sessions of this job, whose first user message starts with "Daily retro."

**Triage:** a day holds up to a few hundred sessions and tens of MB, so use the `pi-sessions` skill to build one row per session first: working directory, first user message, user message count, tool error count, duration, and skills loaded. Read in depth only the sessions that show corrections, re-steers, tool errors, retries, or unusual length, plus a sample of the common workflows to judge which guidance is used.

**Factory reviews:** read the comments, reviews, and inline comments `juanibiapina` made yesterday on PRs authored by `app/zerocoding-app` (`gh search prs --author app/zerocoding-app --updated <day>`). Each one is a sign the factory missed something: state the general rule that would have prevented it, worded to apply beyond that PR, and where it should live.

**Findings:** each finding states the problem, the evidence (session file paths with the relevant quote, or comment links), the proposed change, and its target file in this repo; load the `writing-skills` skill before wording a change to a skill or prompt. Propose changes only to files in this repo. When nothing is worth encoding, record nothing and say so.

**Reporting:** the open issue labeled `retro-index` in `juanibiapina/dotfiles` is the source of truth for retro findings, so none is lost. Its body is a checklist, highest value first, with one line per finding: a short title, then the link to its issue, or, until it has one, the link to the comment on the index that holds its write-up. Run every `gh` write with `~/.config/zerocoding-app/bin/gh` so the bot authors it.

1. Read the index (`gh issue list -R juanibiapina/dotfiles --label retro-index --state open`) and its comments.
2. Check off every line whose issue is closed.
3. For each finding an unchecked line already covers, comment the new evidence on its issue, or on the index when it has no issue. Post each new finding as a comment on the index and add its line at its place in the value order.
4. Count the open issues labeled `retro` (`gh issue list -R juanibiapina/dotfiles --label retro --state open`). While fewer than 4 are open, open an issue for the highest unchecked line without one, with `gh issue create -R juanibiapina/dotfiles --label retro` and the write-up as its body, and replace the line's link with the issue link. Add no other label, so Juan picks which ones get `factory`.
5. Save the checklist with `gh issue edit <index> -R juanibiapina/dotfiles --body-file <file>`.
