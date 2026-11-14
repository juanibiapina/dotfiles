// Everything the inbox asks of GitHub, through `gh` on this Mac. Arguments go
// as arrays, never through a shell.
//
// The inbox is GitHub's unread notifications: GitHub lists deleted ("done")
// threads exactly like read ones, so read ones can't be shown. Only dismiss()
// removes a notification: it marks the thread read, then deletes it, so
// GitHub's last_read_at says when you dismissed it if the thread comes back.

import { exec } from "herdr";
import { digest } from "./thread.js";

export async function gh(args) {
  const r = await exec("gh", args, { timeout: 60_000 });
  if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim().split("\n").slice(-3).join("\n") || `gh ${args.slice(0, 2).join(" ")} failed`);
  return r.stdout;
}
const json = async (args) => JSON.parse(await gh(args));

// ---- Notifications ----

export async function listThreads() {
  const out = await gh(["api", "--paginate", "/notifications", "--jq",
    ".[] | {id, reason, unread, updated_at, last_read_at, repo: .repository.full_name, type: .subject.type, title: .subject.title, url: .subject.url}"]);
  return out.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

// What happened after this moment is new: when you last read the thread.
export const baseline = (t) => t.last_read_at ?? null;

export async function dismiss(threads) {
  await Promise.all(threads.map(async (t) => {
    await gh(["api", "-X", "PATCH", `/notifications/threads/${t.id}`]);
    await gh(["api", "-X", "DELETE", `/notifications/threads/${t.id}`]);
  }));
}

export async function unsubscribe(t) {
  await gh(["api", "-X", "DELETE", `/notifications/threads/${t.id}/subscription`]);
  await dismiss([t]);
}

// ---- Subjects ----

const REACTIONS = "reactionGroups { content viewerHasReacted reactors { totalCount } }";
const ACTOR = "actor { __typename login }";
const COMMON_ITEMS = `
  ... on IssueComment { id author { __typename login } body createdAt url ${REACTIONS} }
  ... on ClosedEvent { id ${ACTOR} createdAt stateReason }
  ... on ReopenedEvent { id ${ACTOR} createdAt }
  ... on LabeledEvent { id ${ACTOR} createdAt label { name } }
  ... on UnlabeledEvent { id ${ACTOR} createdAt label { name } }
  ... on AssignedEvent { id ${ACTOR} createdAt assignee { ... on User { login } ... on Bot { login } } }
  ... on CrossReferencedEvent { id ${ACTOR} createdAt source {
    ... on Issue { number title url repository { nameWithOwner } }
    ... on PullRequest { number title url repository { nameWithOwner } } } }
  ... on RenamedTitleEvent { id ${ACTOR} createdAt previousTitle currentTitle }`;
const COMMON_TYPES = "ISSUE_COMMENT, CLOSED_EVENT, REOPENED_EVENT, LABELED_EVENT, UNLABELED_EVENT, ASSIGNED_EVENT, CROSS_REFERENCED_EVENT, RENAMED_TITLE_EVENT";
const SUBJECT = `
  id number title url body createdAt author { __typename login } ${REACTIONS} labels(first: 20) { nodes { name } }`;

const QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    issueOrPullRequest(number: $number) {
      __typename
      ... on Issue {
        ${SUBJECT} state stateReason
        timelineItems(last: 100, itemTypes: [${COMMON_TYPES}]) { totalCount nodes { __typename ${COMMON_ITEMS} } }
      }
      ... on PullRequest {
        ${SUBJECT} state isDraft reviewDecision headRefName baseRefName additions deletions changedFiles
        commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
        reviewRequests(first: 10) { nodes { requestedReviewer { ... on User { login } ... on Team { slug } ... on Bot { login } } } }
        timelineItems(last: 100, itemTypes: [${COMMON_TYPES}, PULL_REQUEST_REVIEW, PULL_REQUEST_COMMIT, HEAD_REF_FORCE_PUSHED_EVENT, MERGED_EVENT, READY_FOR_REVIEW_EVENT, CONVERT_TO_DRAFT_EVENT, REVIEW_REQUESTED_EVENT]) {
          totalCount nodes { __typename ${COMMON_ITEMS}
            ... on PullRequestReview { id author { __typename login } state body createdAt submittedAt url comments { totalCount } ${REACTIONS} }
            ... on PullRequestCommit { id url commit { messageHeadline committedDate author { user { __typename login } } } }
            ... on HeadRefForcePushedEvent { id ${ACTOR} createdAt }
            ... on MergedEvent { id ${ACTOR} createdAt }
            ... on ReadyForReviewEvent { id ${ACTOR} createdAt }
            ... on ConvertToDraftEvent { id ${ACTOR} createdAt }
            ... on ReviewRequestedEvent { id ${ACTOR} createdAt requestedReviewer { ... on User { login } ... on Team { slug } ... on Bot { login } } }
          }
        }
      }
    }
  }
}`;

async function graphql(query, vars) {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [k, v] of Object.entries(vars)) args.push(typeof v === "number" ? "-F" : "-f", `${k}=${v}`);
  const r = JSON.parse(await gh(args));
  if (r.errors?.length) throw new Error(r.errors.map((e) => e.message).join("; "));
  return r.data;
}

// "Test workflow run failed for main branch", optionally ", Attempt #2".
function workflowOf(title) {
  const m = title.match(/^(.*?) workflow run(?:, Attempt #\d+)? \w+ for (.+) branch$/);
  return m ? { workflow: m[1], branch: m[2] } : null;
}

async function loadRun(t) {
  const w = workflowOf(t.title);
  if (!w) return { kind: "ci", url: `https://github.com/${t.repo}/actions`, run: null };
  const runs = await json(["run", "list", "-R", t.repo, "-b", w.branch, "-w", w.workflow, "-L", "1", "--json", "databaseId,url,conclusion,status,displayTitle,event"]);
  const run = runs[0];
  if (!run) return { kind: "ci", url: `https://github.com/${t.repo}/actions`, run: null };
  const failed = JSON.parse(await gh(["run", "view", String(run.databaseId), "-R", t.repo, "--json", "jobs", "--jq",
    "[.jobs[] | select(.conclusion == \"failure\") | .name]"]));
  return { kind: "ci", url: run.url, run: { id: run.databaseId, url: run.url, title: run.displayTitle, branch: w.branch, workflow: w.workflow, conclusion: run.conclusion || run.status, failed } };
}

async function loadRelease(t) {
  const r = await json(["api", t.url, "--jq", "{name, tag_name, body, html_url, author: .author.login, published_at}"]);
  return { kind: "release", url: r.html_url, title: r.name || r.tag_name, release: r };
}

// What a notification is about, as the inbox shows it: see thread.js for issues and PRs.
export async function loadThread(t) {
  const m = t.url?.match(/\/repos\/([^/]+)\/([^/]+)\/(pulls|issues)\/(\d+)$/);
  if (m) {
    const data = await graphql(QUERY, { owner: m[1], name: m[2], number: Number(m[4]) });
    const subject = data.repository?.issueOrPullRequest;
    if (!subject) throw new Error(`${t.repo}#${m[4]} is gone`);
    return { ...digest(subject, baseline(t), data.viewer.login), repo: t.repo };
  }
  if (t.type === "CheckSuite") return { ...(await loadRun(t)), repo: t.repo };
  if (t.type === "Release" && t.url) return { ...(await loadRelease(t)), repo: t.repo };
  return { kind: "other", repo: t.repo, url: `https://github.com/${t.repo}${t.type === "Discussion" ? "/discussions" : ""}` };
}

// ---- Acting on a subject ----

export const comment = (view, body) =>
  graphql("mutation($id: ID!, $body: String!) { addComment(input: {subjectId: $id, body: $body}) { clientMutationId } }", { id: view.nodeId, body });

// Toggles: removes the reaction when it's already yours.
export function react(item, content) {
  const mine = item.reactions?.some((r) => r.content === content && r.mine);
  const op = mine ? "removeReaction" : "addReaction";
  return graphql(`mutation($id: ID!, $content: ReactionContent!) { ${op}(input: {subjectId: $id, content: $content}) { clientMutationId } }`, { id: item.nodeId, content });
}

export const REVIEW_EVENTS = [["approve", "Approve"], ["request-changes", "Request changes"], ["comment", "Comment"]];
export const review = (view, event, body) =>
  gh(["pr", "review", String(view.number), "-R", view.repo, `--${event}`, ...(body ? ["-b", body] : [])]);

export const rerunFailed = (view) => gh(["run", "rerun", String(view.run.id), "--failed", "-R", view.repo]);

// The web page for a thread, or for one item in it.
export function webUrl(t, view, item) {
  if (item?.url) return item.url;
  if (view?.url) return view.url;
  const m = t.url?.match(/repos\/([^/]+\/[^/]+)\/(pulls|issues|commits)\/(\w+)/);
  if (m) return `https://github.com/${m[1]}/${{ pulls: "pull", issues: "issues", commits: "commit" }[m[2]]}/${m[3]}`;
  return `https://github.com/${t.repo}`;
}
