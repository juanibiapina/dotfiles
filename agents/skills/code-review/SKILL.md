---
name: code-review
description: Reviews a pull request or local diff for real bugs, requirement gaps, and cleanup, and posts terse inline comments followed by a summary comment that closes the review cycle. Use when asked to review a PR, review code, review a diff, or "code review".
---

# Code Review

Review like a careful senior engineer who has the whole repository open. The goal is *signal*: every comment is something the author will want to fix, and an empty review is a valid result when nothing real is found.

## Gather context

- The diff: `gh pr diff <pr>` for a PR, otherwise the branch's diff against its base plus uncommitted changes.
- The requirements: the PR description, every linked issue, and any plan or spec they point to. Code that is sound in isolation can still miss them.
- The rules: every AGENTS.md that governs a changed path, from the repo root down to the changed file's directory.
- For a large diff, sketch a review order first, and note findings as you read instead of at the end.

## Look for

Read every hunk together with its enclosing function; bugs in untouched lines of a touched function count.

- **Correctness**: inverted conditions, off-by-one, null or undefined access, missing `await`, swallowed errors, races, wrong variable.
- **Removed behaviour**: for each deleted or replaced line, name the invariant it enforced and find where the new code keeps it.
- **Callers and callees**: search for every caller of a changed function and check new preconditions, return shapes, errors, and ordering.
- **Requirements**: what the issue or plan asks for that the diff misses or contradicts, and untested new behaviour.
- **Root cause**: a special case patched onto shared code where a change to the underlying mechanism is simpler and general.
- **Design cost**: code that exists only to guard against problems the design itself creates, such as races, stale snapshots, or retry bookkeeping. Name the design change that removes the whole class of problem.
- **Cleanup**: re-implemented helpers that already exist (name them), needless complexity or dead code, wasted work on hot paths.
- **Conventions**: only when you can quote the exact AGENTS.md rule and the line that breaks it.

Correctness outranks cleanup. Each finding needs a concrete failure scenario (inputs or state, then the wrong result) or a concrete cost.

## Write the review

The review is *terse*: each comment states the exact problem, and nothing else. The author already knows what the change does and why, so context, summaries, and explanations of the code are repetition.

- One comment per problem: what is wrong and the concrete case where it fails, in one or two sentences. When the same mistake repeats, one comment lists every place.
- A fix is optional. When one is obvious, add it as a short hint or a ```` ```suggestion ```` block, never as a requirement.
- Anchor each comment to the line range it is about.
- A problem already raised in an earlier cycle and still present keeps its existing thread; do not comment it again.

## Post the review cycle

A PR can go through several review cycles. Each cycle ends with one summary comment, so whoever fixes the findings can work from it alone.

1. Find the cycle number: one more than the highest `cycle=` in earlier summary comments on the PR, or 1.
2. Settle the unresolved threads from your earlier cycles and from Copilot against what changed since they were posted. Leave threads that people started for them to resolve. Resolve a thread when the problem is gone, or when the author's reply gives a reason you accept. Leave it open when the problem remains; it goes into the summary as `Still open`. Copilot never resolves its own threads, so you do.

   ```bash
   gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved path line comments(first:20){nodes{databaseId author{login} body url}}}}}}}' -F o=<owner> -F r=<repo> -F n=<pr>
   gh api graphql -f query='mutation($t:ID!){resolveReviewThread(input:{threadId:$t}){thread{isResolved}}}' -F t=<thread-id>
   ```

3. If there are new findings, post them as one review with event `COMMENT` and an empty body, and note each new comment's `id` and `html_url`:

   ```bash
   gh api repos/<owner>/<repo>/pulls/<pr>/reviews --input review.json
   gh api repos/<owner>/<repo>/pulls/<pr>/reviews/<review-id>/comments   # ids and URLs of the new comments
   ```

   ```json
   {
     "event": "COMMENT",
     "body": "",
     "comments": [
       { "path": "src/a.ts", "start_line": 10, "line": 14, "side": "RIGHT", "body": "`retry` never resets after a success, so the third failure in a day stops all retries." }
     ]
   }
   ```

   Inline comments may only target lines that appear in the diff on the side given; GitHub rejects the whole review otherwise. Omit `start_line` for a single line. Write `review.json` outside the repository.

4. Post the summary as a PR comment with `gh pr comment <pr> --body-file <file>`. It lists every open issue, new or still open from an earlier cycle, most severe first, and nothing else:

   <example>
   <!-- code-review cycle=2 open=3 -->
   ### 🟡 Review 2 · 3 open issues

   - **High** · [Retries stop after the third failure in a day](https://github.com/o/r/pull/9#discussion_r101) · `src/a.ts:10-14` · New
   - **Medium** · [Title is not trimmed before the length check](https://github.com/o/r/pull/9#discussion_r87) · `src/title.ts:22` · Still open
   - **Low** · [Same timeout constant defined twice](https://github.com/o/r/pull/9#discussion_r102) · `src/a.ts:3`, `src/b.ts:8` · New
   </example>

   Each title names the problem in a few words and links to its inline comment. A finding that fits no line goes in the list with its description instead of a link. When nothing is open, the whole summary is the marker and `### 🟢 Review <n> · no open issues`.

Without a PR, or when asked not to post, report the findings in chat as `file:line — problem`.
