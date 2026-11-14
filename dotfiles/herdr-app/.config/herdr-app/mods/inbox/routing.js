// Where a GitHub thread can go: the sessions that already handle it or work
// near it, places to start a new one, and what to tell the agent. Pure, so
// `node --test` runs it, and shared: the phone's github mod imports this file
// through a symlink in the repository.
//
// A session handles a thread when its terminal carries the label
// `github.<owner>/<repo>#<number>=<time routed>` (see `hc label`).

const WHY = { linked: "handles this", branch: "on this branch", repo: "in repo" };
const ORDER = { linked: 0, branch: 1, repo: 2, none: 3 };

// Null for threads without an issue or PR number (CI runs, releases): those aren't linked.
export const labelKey = (subject) => (subject.number ? `github.${subject.repo}#${subject.number}` : null);
export const label = (subject, now = new Date()) => (subject.number ? `${labelKey(subject)}=${now.toISOString()}` : null);

// The threads a session was given: [{ repo, number, at }].
export function linksOf(session) {
  return Object.entries(session.labels ?? {})
    .map(([key, at]) => {
      const m = key.match(/^github\.([^#\s]+\/[^#\s]+)#(\d+)$/);
      return m ? { repo: m[1], number: Number(m[2]), at } : null;
    })
    .filter(Boolean);
}

// Thread key → the live sessions it was routed to, newest first.
export function linkIndex(sessions) {
  const index = new Map();
  for (const s of sessions) {
    for (const [key, at] of Object.entries(s.labels)) {
      if (!key.startsWith("github.")) continue;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({ session: s, at });
    }
  }
  for (const list of index.values()) list.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return index;
}

// A folder inside a clone of the repo: ~/workspace/<owner>/<repo>, or a
// checkout the worktree mod made in ~/.herdr/worktrees/<repo>/<branch>.
export function inRepo(folder, repo) {
  if (!folder) return false;
  const f = folder.replace(/\/+$/, "");
  const name = repo.split("/")[1];
  return f.endsWith(`/workspace/${repo}`) || f.includes(`/workspace/${repo}/`) || f.includes(`/.herdr/worktrees/${name}/`);
}

// Every session with why it fits: linked, branch, repo, or null. Best first.
export function rank(sessions, subject) {
  const key = labelKey(subject);
  return sessions
    .map((session) => {
      const here = inRepo(session.cwd, subject.repo);
      const why = key && session.labels?.[key] ? "linked"
        : here && subject.head && session.branch === subject.head ? "branch"
        : here ? "repo" : null;
      return { session, why };
    })
    .sort((a, b) =>
      ORDER[a.why ?? "none"] - ORDER[b.why ?? "none"]
      || (a.why === "linked" ? Date.parse(b.session.labels[key]) - Date.parse(a.session.labels[key]) : 0)
      || (b.session.recency ?? 0) - (a.session.recency ?? 0));
}

// The picker's rows: sessions that fit, then places to start one, then every other session.
export function targets(sessions, places, subject) {
  const ranked = rank(sessions, subject).map((r) => ({ kind: "session", ...r, blocked: r.session.status === "blocked" }));
  return [
    ...ranked.filter((r) => r.why),
    ...places.map((place) => ({ kind: "place", place })),
    ...ranked.filter((r) => !r.why),
  ];
}

// What a row says: { title, detail }.
export function describe(target, subject) {
  if (target.kind === "place") {
    const p = target.place;
    if (p.kind === "space") return { title: `New session in ${p.space.name}`, detail: p.space.machine ?? "" };
    if (p.kind === "clone") return { title: `New space for ${subject.repo.split("/")[1]}`, detail: p.machine ?? "this computer" };
    return { title: `Clone ${subject.repo} and start`, detail: "this computer" };
  }
  const s = target.session;
  return {
    title: s.name,
    detail: [s.space, s.machine, target.blocked ? "needs you" : WHY[target.why]].filter(Boolean).join(" · "),
  };
}

function fuzzy(text, query) {
  const t = text.toLowerCase();
  let at = 0;
  for (const ch of query.toLowerCase().replace(/\s+/g, "")) {
    const i = t.indexOf(ch, at);
    if (i < 0) return false;
    at = i + 1;
  }
  return true;
}

export function filter(list, query, subject) {
  if (!query.trim()) return list;
  return list.filter((x) => {
    const d = describe(x, subject);
    return fuzzy(`${d.title} ${d.detail}`, query);
  });
}

// Messages to start from, best first: [{ id, label, text }]. linkedAt: when
// the session that gets it was last given this thread, if it was.
export function presets(subject, { linkedAt } = {}) {
  const url = subject.url;
  const out = [];
  if (linkedAt) {
    out.push({ id: "since", label: "New activity", text: `There is new activity on ${url}${subject.summary ? ` (${subject.summary})` : ""}. Read what changed and carry on.` });
  }
  if (subject.kind === "pr") {
    const pr = [
      { id: "review", label: "Review it", text: `Review the pull request ${url}: read its description, diff and comments with gh, then tell me what it changes and any problems you find. Don't push anything.` },
      { id: "comments", label: "Address comments", text: `Address the review comments on the pull request ${url}: read them with gh, make the changes they ask for and push.` },
      ...(subject.failing ? [{ id: "fix", label: "Fix the checks", text: `Find out why the checks fail on the pull request ${url} (gh pr checks, gh run view --log-failed), fix it and push.` }] : []),
      { id: "work", label: "Work on it", text: `Work on the pull request ${url}. Read it with gh first, then wait for my instructions.` },
    ];
    const first = subject.reason === "author" ? (subject.failing ? "fix" : "comments") : "review";
    out.push(...pr.filter((p) => p.id === first), ...pr.filter((p) => p.id !== first));
  } else if (subject.kind === "issue") {
    out.push(
      { id: "investigate", label: "Look into it", text: `Look into the issue ${url}: read it with gh, find the cause or the answer, and report back without changing anything.` },
      { id: "work", label: "Work on it", text: `Work on the issue ${url}: read it with gh, then make the change.` },
    );
  } else if (subject.kind === "ci") {
    out.push({ id: "ci", label: "Find the cause", text: `CI failed in ${subject.repo}: ${subject.title}. Find the cause in ${url} and report back.` });
  } else {
    out.push({ id: "look", label: "Look at it", text: `Look at ${url} (${subject.title}).` });
  }
  return out;
}

// The shell command a new session runs: it labels its own terminal with the
// thread, then becomes the agent. Arguments, never interpolation.
export function startArgv(agentArgv, labelArg) {
  return ["sh", "-c",
    'h=$(command -v hc || echo "$HOME/.local/bin/hc"); [ -n "$1" ] && [ -n "$HC_TERMINAL_ID" ] && "$h" label "$HC_TERMINAL_ID" "$1" >/dev/null 2>&1; shift; exec "$@"',
    "sh", labelArg ?? "", ...agentArgv];
}
