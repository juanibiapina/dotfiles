---
description: Review a finished factory run and open improvement issues on dotfiles
argument-hint: "<owner/repo>#<n>"
---

Factory retro for $ARGUMENTS. Use the `retro` skill on this finished factory run, in this clone. Below, `<repo>` is the `owner/repo` and `<n>` the issue number from that argument.

**Run start:** the `created_at` of the newest `labeled` event for the `factory` label in `gh api repos/<repo>/issues/<n>/events`, or the issue's creation time when there is no such event.

**Sessions:** the run's sessions are the files in this clone's pi session directory (`~/.pi/agent/sessions/--home-juan-factory-<name>--/`) created after the run start. They are:

- the coordinator sessions: the first user message asks for the factory skill on `<repo>#<n>`, and it is neither an Orca worker preamble nor a retro (a first message starting with "Factory retro for"). Coordinators restarted by hand get other wording than the pickup prompt `Use the factory skill to process <repo>#<n>.`;
- the worker sessions whose first user message names one of those coordinators' terminal handles (`Your coordinator's terminal handle is: term_…`). A coordinator's handle appears in its session, in the output of `orca orchestration run-create` or `run-current`.

**Juan's comments:** read the comments from `juanibiapina` on the issue, and the reviews, inline comments, and comments on the run's PRs. Find the PRs with `gh pr list -R <repo> --state all --search head:factory/<n>- --json number,headRefName,createdAt`, and read every one created after the run start. An issue can have several PRs; comments that made Juan close one are the strongest evidence. Treat each comment as a sign the factory missed something: state the general rule that would have prevented it, worded to apply beyond this PR, and where it should live (a skill, a worker spec in the factory skill, or a repo's AGENTS.md), linking the comment.

**Reporting:** instead of presenting findings to the user, open one issue per finding with `gh issue create -R juanibiapina/dotfiles`, stating the problem, the evidence links, and the proposed change and its target file. First search the open issues authored by `app/zerocoding-app` there; if one already covers the finding, comment the new evidence on it instead. Leave the issues unlabeled, so Juan decides which ones get `factory`. Skip findings that are not worth encoding, and open nothing when nothing is worth reporting. Leave the run's issue and PRs untouched.
