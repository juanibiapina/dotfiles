// What happened in an issue or pull request, split at the moment you last
// looked. Pure: it takes the GraphQL subject that github.js fetches and
// returns what the inbox shows, so `node --test` runs it without Herdr.

export const REACTIONS = [
  ["THUMBS_UP", "👍"], ["THUMBS_DOWN", "👎"], ["LAUGH", "😄"], ["HOORAY", "🎉"],
  ["CONFUSED", "😕"], ["HEART", "❤️"], ["ROCKET", "🚀"], ["EYES", "👀"],
];
const EMOJI = Object.fromEntries(REACTIONS);

// The later of GitHub's last_read_at and the moment this inbox last saw the thread.
export function baseline(lastReadAt, seenAt) {
  const times = [lastReadAt, seenAt].filter(Boolean);
  if (!times.length) return null;
  return times.reduce((a, b) => (Date.parse(a) >= Date.parse(b) ? a : b));
}

const login = (a) => (a?.login ?? "ghost").replace(/^app\//, "").replace(/\[bot\]$/, "");
const isBot = (a) => a?.__typename === "Bot" || /\[bot\]$|^app\//.test(a?.login ?? "");

function reactions(groups) {
  return (groups ?? [])
    .map((g) => ({ content: g.content, emoji: EMOJI[g.content] ?? g.content, count: g.reactors?.totalCount ?? g.users?.totalCount ?? 0, mine: !!g.viewerHasReacted }))
    .filter((r) => r.count > 0);
}

const reviewer = (r) => r?.login ?? (r?.name ? `@${r.name}` : null) ?? (r?.slug ? `@${r.slug}` : "someone");

// One timeline node as an item, or null for kinds the inbox doesn't show.
function item(n) {
  const who = n.actor ?? n.author;
  const base = { id: n.id, nodeId: n.id, author: login(who), bot: isBot(who), at: n.createdAt, url: n.url ?? null };
  switch (n.__typename) {
    case "IssueComment":
      return { ...base, kind: "comment", body: n.body ?? "", reactions: reactions(n.reactionGroups) };
    case "PullRequestReview":
      if (n.state === "PENDING") return null;
      return { ...base, kind: "review", at: n.submittedAt ?? n.createdAt, state: n.state, body: n.body ?? "", inline: n.comments?.totalCount ?? 0, reactions: reactions(n.reactionGroups) };
    case "PullRequestCommit":
      return { ...base, kind: "commits", author: login(n.commit?.author?.user), bot: isBot(n.commit?.author?.user), at: n.commit?.committedDate, commits: [n.commit?.messageHeadline ?? ""] };
    case "HeadRefForcePushedEvent":
      return { ...base, kind: "event", event: "force-pushed" };
    case "ClosedEvent":
      return { ...base, kind: "event", event: n.stateReason === "NOT_PLANNED" ? "closed as not planned" : "closed" };
    case "ReopenedEvent":
      return { ...base, kind: "event", event: "reopened" };
    case "MergedEvent":
      return { ...base, kind: "event", event: "merged" };
    case "ReadyForReviewEvent":
      return { ...base, kind: "event", event: "marked ready for review" };
    case "ConvertToDraftEvent":
      return { ...base, kind: "event", event: "converted to draft" };
    case "LabeledEvent":
      return { ...base, kind: "labels", added: [n.label?.name], removed: [] };
    case "UnlabeledEvent":
      return { ...base, kind: "labels", added: [], removed: [n.label?.name] };
    case "AssignedEvent":
      return { ...base, kind: "event", event: `assigned ${login(n.assignee)}` };
    case "ReviewRequestedEvent":
      return { ...base, kind: "review_requested", reviewers: [reviewer(n.requestedReviewer)] };
    case "CrossReferencedEvent": {
      const s = n.source;
      if (!s?.number) return null;
      return { ...base, kind: "reference", ref: { number: s.number, title: s.title, url: s.url, repo: s.repository?.nameWithOwner } };
    }
    case "RenamedTitleEvent":
      return { ...base, kind: "event", event: `renamed from “${n.previousTitle}”` };
    default:
      return null;
  }
}

// Folds runs of commits, label changes and review requests by the same person into one item.
function batch(items) {
  const out = [];
  for (const it of items) {
    const prev = out.at(-1);
    const same = prev && prev.kind === it.kind && prev.author === it.author;
    if (same && it.kind === "commits") {
      out[out.length - 1] = { ...prev, at: it.at, commits: [...prev.commits, ...it.commits] };
    } else if (same && it.kind === "labels") {
      const added = [...prev.added.filter((l) => !it.removed.includes(l)), ...it.added];
      const removed = [...prev.removed.filter((l) => !it.added.includes(l)), ...it.removed];
      out[out.length - 1] = { ...prev, at: it.at, added, removed };
    } else if (same && it.kind === "review_requested") {
      out[out.length - 1] = { ...prev, at: it.at, reviewers: [...new Set([...prev.reviewers, ...it.reviewers])] };
    } else {
      out.push(it);
    }
  }
  return out;
}

const after = (at, since) => since === null || (at && Date.parse(at) > Date.parse(since));

function summarize(items, viewer) {
  const s = { comments: 0, reviews: [], commits: 0, events: [] };
  for (const it of items) {
    if (it.author === viewer) continue;
    if (it.kind === "comment") s.comments++;
    else if (it.kind === "review") s.reviews.push(it.state);
    else if (it.kind === "commits") s.commits += it.commits.length;
    else if (it.kind === "event") s.events.push(it.event);
  }
  return s;
}

function ci(subject) {
  const state = subject.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state;
  return state ? { SUCCESS: "success", FAILURE: "failure", ERROR: "failure", PENDING: "pending", EXPECTED: "pending" }[state] ?? null : null;
}

// subject: an Issue or PullRequest from github.js's query. since: ISO time or null. viewer: your login.
export function digest(subject, since, viewer) {
  const isPr = subject.__typename === "PullRequest";
  const nodes = subject.timelineItems?.nodes ?? [];
  const all = nodes.map(item).filter(Boolean).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const description = {
    id: subject.id, nodeId: subject.id, kind: "description", author: login(subject.author), bot: isBot(subject.author), at: subject.createdAt,
    url: subject.url, body: subject.body ?? "", reactions: reactions(subject.reactionGroups),
  };
  const fresh = all.filter((it) => after(it.at, since));
  const older = all.filter((it) => !after(it.at, since));
  const newItems = batch(fresh);
  const descriptionIsNew = after(subject.createdAt, since);
  return {
    kind: isPr ? "pr" : "issue",
    nodeId: subject.id,
    number: subject.number,
    title: subject.title,
    url: subject.url,
    state: isPr ? (subject.state === "MERGED" ? "merged" : subject.state === "CLOSED" ? "closed" : subject.isDraft ? "draft" : "open")
      : subject.state === "CLOSED" ? (subject.stateReason === "NOT_PLANNED" ? "not planned" : "completed") : "open",
    author: login(subject.author),
    authorBot: isBot(subject.author),
    labels: (subject.labels?.nodes ?? []).map((l) => l.name),
    pr: isPr ? {
      head: subject.headRefName, base: subject.baseRefName, additions: subject.additions, deletions: subject.deletions,
      files: subject.changedFiles, ci: ci(subject), decision: subject.reviewDecision ?? null,
      pending: (subject.reviewRequests?.nodes ?? []).map((r) => reviewer(r.requestedReviewer)),
    } : null,
    since,
    viewer,
    description,
    descriptionIsNew,
    newItems,
    olderItems: batch(older),
    olderOnGitHub: Math.max(0, (subject.timelineItems?.totalCount ?? 0) - nodes.length),
    summary: summarize(newItems, viewer),
    newCount: (descriptionIsNew && description.author !== viewer ? 1 : 0) + newItems.filter((it) => it.author !== viewer).length,
  };
}
