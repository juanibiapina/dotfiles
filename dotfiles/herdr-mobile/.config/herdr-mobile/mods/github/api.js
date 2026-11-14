// Everything that talks to GitHub: `gh` on the definition machine, with the
// login it already has. Arguments go as an array, never through a shell.

import { exec, shared, setShared, notify } from "herdr";

export async function gh(args) {
  const r = await exec("gh", args);
  if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim().split("\n").slice(-3).join("\n") || `gh ${args.slice(0, 2).join(" ")} failed`);
  return r.stdout;
}
const json = async (args) => JSON.parse(await gh(args));
const ndjson = async (args) => (await gh(args)).split("\n").filter(Boolean).map((l) => JSON.parse(l));

export const errorText = (e) => String((e && e.message) || e);
export const failed = (e) => notify({ title: "GitHub said no", body: errorText(e), level: "error", timeout: 8000 });

// ---- Notifications, kept in shared "github.items" so every face agrees ----

const NOTE = ".[] | {id, unread, reason, updated_at, title: .subject.title, type: .subject.type, url: .subject.url, repo: .repository.full_name}";
const newestFirst = (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at);

export const items = () => shared("github.items") ?? null;
const setItems = (list) => setShared("github.items", [...list].sort(newestFirst));

export async function loadInbox() {
  setItems(await ndjson(["api", "--paginate", "notifications?all=true", "--jq", NOTE]));
}

export async function loadMe() {
  if (!shared("github.me")) setShared("github.me", (await gh(["api", "user", "--jq", ".login"])).trim());
}
export const me = () => shared("github.me") ?? null;

// Changes the list at once and puts it back if GitHub says no.
function optimistic(change, f) {
  const before = items() ?? [];
  setItems(change(before));
  return Promise.resolve()
    .then(f)
    .catch((e) => {
      setItems(before);
      failed(e);
    });
}
const without = (ids) => (list) => list.filter((n) => !ids.has(n.id));

export const markRead = (n) => optimistic((l) => l.map((x) => (x.id === n.id ? { ...x, unread: false } : x)),
  () => gh(["api", "-X", "PATCH", `notifications/threads/${n.id}`]));
export const markDone = (ns) => optimistic(without(new Set(ns.map((n) => n.id))),
  () => Promise.all(ns.map((n) => gh(["api", "-X", "DELETE", `notifications/threads/${n.id}`]))));
export const unsubscribe = (n) => optimistic(without(new Set([n.id])), async () => {
  await gh(["api", "-X", "DELETE", `notifications/threads/${n.id}/subscription`]);
  await gh(["api", "-X", "DELETE", `notifications/threads/${n.id}`]);
});
export const markAllRead = () => optimistic((l) => l.map((x) => ({ ...x, unread: false })),
  () => gh(["api", "-X", "PUT", "notifications", "-F", "read=true"]));

// What a notification opens: a page's props, or null.
export function target(n) {
  const m = n.url && n.url.match(/\/repos\/([^/]+\/[^/]+)\/(pulls|issues|releases)\/(\d+)$/);
  if (m && m[2] === "pulls") return { pr: { repo: n.repo, number: Number(m[3]) } };
  if (m && m[2] === "issues") return { issue: { repo: n.repo, number: Number(m[3]) } };
  if (m && m[2] === "releases") return { release: { repo: n.repo, id: m[3] } };
  if (n.type === "CheckSuite") {
    const c = n.title.match(/^(.*?) workflow run(?:, Attempt #\d+)? \w+ for (.+) branch$/);
    return { ci: { repo: n.repo, workflow: c ? c[1] : null, branch: c ? c[2] : null } };
  }
  return null;
}

// The web page of a notification.
export function webUrl(n) {
  const repo = `https://github.com/${n.repo}`;
  const m = n.url && n.url.match(/\/repos\/[^/]+\/[^/]+\/(pulls|issues|commits|discussions)\/([^/]+)$/);
  if (m) return `${repo}/${m[1] === "pulls" ? "pull" : m[1] === "commits" ? "commit" : m[1]}/${m[2]}`;
  if (n.type === "CheckSuite") return `${repo}/actions`;
  if (n.type === "Release") return `${repo}/releases`;
  return repo;
}

// A github.com link, as a page's props (or null).
export function linkTarget(url) {
  const m = url.match(/^https?:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/(pull|issues|releases\/tag|actions\/runs)\/([^/?#]+)/);
  if (!m) return null;
  const [, repo, kind, id] = m;
  if (kind === "pull") return /^\d+$/.test(id) ? { pr: { repo, number: Number(id) } } : null;
  if (kind === "issues") return /^\d+$/.test(id) ? { ref: { repo, number: Number(id) } } : null;
  if (kind === "releases/tag") return { release: { repo, tag: decodeURIComponent(id) } };
  return /^\d+$/.test(id) ? { run: { repo, id: Number(id) } } : null;
}

// ---- Bumps: a change made anywhere reloads the pages that show it ----

export const bump = () => setShared("github.bump", (shared("github.bump") ?? 0) + 1);
export const bumped = () => shared("github.bump") ?? 0;

// Bots come back from gh as "app/name".
const person = (a) => (a && a.login ? { ...a, login: a.login.replace(/^app\//, "") } : a);
const people = (x) => ({ ...x, author: person(x.author), comments: (x.comments ?? []).map((c) => ({ ...c, author: person(c.author) })) });

// ---- Pull requests ----

const PR_FIELDS = "number,title,state,isDraft,author,body,url,createdAt,mergedAt,closedAt,baseRefName,headRefName,additions,deletions,changedFiles,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup,comments,labels,reviewRequests,commits,autoMergeRequest";

export async function loadPr({ repo, number }) {
  const [pr, reviews, inline] = await Promise.all([
    json(["pr", "view", String(number), "-R", repo, "--json", PR_FIELDS, "--jq", ".commits |= length"]),
    ndjson(["api", "--paginate", `repos/${repo}/pulls/${number}/reviews`, "--jq", ".[] | {id, user: .user.login, state, body, submitted_at}"]),
    ndjson(["api", "--paginate", `repos/${repo}/pulls/${number}/comments`, "--jq",
      ".[] | {id, path, line: (.line // .original_line), body, user: .user.login, created_at, hunk: .diff_hunk, review: .pull_request_review_id, reply: .in_reply_to_id, outdated: (.position == null)}"]),
  ]);
  return { ...people(pr), repo, restReviews: reviews, inline };
}

export const loadFiles = ({ repo, number }) =>
  ndjson(["api", "--paginate", `repos/${repo}/pulls/${number}/files`, "--jq", ".[] | {filename, previous_filename, status, additions, deletions, patch}"]);

export const loadRepoMerge = (repo) =>
  json(["repo", "view", repo, "--json", "squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed,deleteBranchOnMerge,viewerDefaultMergeMethod"]);

const pr = (cmd, { repo, number }, extra = []) => gh(["pr", cmd, String(number), "-R", repo, ...extra]);
export const prComment = (t, body) => pr("comment", t, ["--body", body]);
export const prReview = (t, event, body) => pr("review", t, [`--${event}`, ...(body ? ["--body", body] : [])]);
export const prMerge = (t, method, { deleteBranch, auto }) => pr("merge", t, [`--${method}`, ...(deleteBranch ? ["--delete-branch"] : []), ...(auto ? ["--auto"] : [])]);
export const prDisableAuto = (t) => pr("merge", t, ["--disable-auto"]);
export const prClose = (t) => pr("close", t);
export const prReopen = (t) => pr("reopen", t);
export const prReady = (t) => pr("ready", t);
export const prDraft = (t) => pr("ready", t, ["--undo"]);
export const prUpdateBranch = (t) => pr("update-branch", t);

// ---- Issues ----

export async function resolveRef({ repo, number }) {
  const isPr = (await gh(["api", `repos/${repo}/issues/${number}`, "--jq", ".pull_request != null"])).trim() === "true";
  return isPr ? "pr" : "issue";
}

export const loadIssue = async ({ repo, number }) => ({
  ...people(await json(["issue", "view", String(number), "-R", repo, "--json", "number,title,state,stateReason,author,body,url,createdAt,closedAt,labels,comments,assignees,milestone"])),
  repo,
});

const issue = (cmd, { repo, number }, extra = []) => gh(["issue", cmd, String(number), "-R", repo, ...extra]);
export const issueComment = (t, body) => issue("comment", t, ["--body", body]);
export const issueClose = (t, reason, comment) => issue("close", t, ["--reason", reason, ...(comment ? ["--comment", comment] : [])]);
export const issueReopen = (t) => issue("reopen", t);

// ---- Releases ----

const RELEASE = "{name, tag_name, body, author: .author.login, published_at, created_at, prerelease, draft, html_url, assets: [.assets[] | {name, size, download_count}]}";
export async function loadRelease({ repo, id, tag }) {
  const path = id ? `repos/${repo}/releases/${id}` : `repos/${repo}/releases/tags/${encodeURIComponent(tag)}`;
  const [rel, latest] = await Promise.all([
    json(["api", path, "--jq", RELEASE]),
    gh(["api", `repos/${repo}/releases/latest`, "--jq", ".tag_name"]).catch(() => ""),
  ]);
  return { ...rel, repo, latest: latest.trim() === rel.tag_name };
}

// ---- Actions ----

const RUN_LIST = "databaseId,number,displayTitle,status,conclusion,event,headBranch,createdAt,updatedAt,url,workflowName,attempt";
export async function loadRuns({ repo, workflow, branch }) {
  const base = ["run", "list", "-R", repo, "--limit", "15", "--json", RUN_LIST, ...(branch ? ["--branch", branch] : [])];
  try {
    return await json([...base, ...(workflow ? ["--workflow", workflow] : [])]);
  } catch (e) {
    if (!workflow) throw e;
    return (await json(base)).filter((r) => r.workflowName === workflow);
  }
}

export const loadRun = async ({ repo, id }) => ({
  ...(await json(["run", "view", String(id), "-R", repo, "--json", `${RUN_LIST},headSha,jobs`])),
  repo,
});

export const prForBranch = async (repo, branch) =>
  (await json(["pr", "list", "-R", repo, "--head", branch, "--state", "all", "--limit", "1", "--json", "number"]))[0]?.number ?? null;

// The end of a job's log: failed steps when it failed, else all of it.
export async function loadLog({ repo, run, job, failedOnly }) {
  const args = ["run", "view", "-R", repo, ...(job ? ["--job", String(job)] : [String(run)])];
  let out = failedOnly ? await gh([...args, "--log-failed"]).catch(() => "") : "";
  if (!out.trim()) out = await gh([...args, "--log"]);
  return out;
}

export const rerun = ({ repo, run }, failedOnly) => gh(["run", "rerun", String(run), "-R", repo, ...(failedOnly ? ["--failed"] : [])]);
export const cancelRun = ({ repo, run }) => gh(["run", "cancel", String(run), "-R", repo]);

// ---- Work lists ----

const SEARCH = "number,title,repository,author,updatedAt,isDraft,url,commentsCount,labels";
export async function loadWork() {
  const [review, mine, issues] = await Promise.all([
    json(["search", "prs", "--review-requested=@me", "--state=open", "--sort=updated", "--limit", "30", "--json", SEARCH]),
    json(["search", "prs", "--author=@me", "--state=open", "--sort=updated", "--limit", "30", "--json", SEARCH]),
    json(["search", "issues", "--assignee=@me", "--state=open", "--sort=updated", "--limit", "30", "--json", "number,title,repository,author,updatedAt,url,commentsCount,labels"]),
  ]);
  setShared("github.work", { review, mine, issues, at: Date.now() });
}
