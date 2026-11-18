// Everything the Linear dialog asks of Linear, through its GraphQL API with
// Herdr's fetch and a personal API key. Writes go through one queue, so they
// reach Linear in the order the keys were pressed and a refresh never reads
// half of them. This file imports nothing from "herdr", so node can load it.
//
// Each dialog makes its own client in init. Module scope outlives the dialog,
// and closing it cancels a call in flight, which would leave a shared queue
// waiting forever.

const URL = "https://api.linear.app/graphql";
export const KEY_FILE = ".config/linear/api-key";

const ISSUE = `id identifier title url priority updatedAt createdAt labelIds
  state { id } assignee { id name displayName } creator { name } project { id }
  projectMilestone { name } parent { identifier }`;

const META = `query Meta {
  viewer { id name organization { urlKey } }
  teams { nodes { id key name states { nodes { id name type position color } } } }
  issueLabels(first: 250) { nodes { id name color isGroup parent { id name groupType } } }
  projects(first: 50) { nodes {
    id name url description content startDate targetDate progress
    status { name type } lead { name } members(first: 10) { nodes { name } }
    projectMilestones { nodes { name progress } }
  } }
  inboxNotifications(first: 50) { nodes {
    id type category readAt createdAt title subtitle url actor { name }
    ... on IssueNotification { issue { id identifier title url } }
  } }
}`;

const ISSUES = `query Issues($after: String) {
  issues(filter: { state: { type: { nin: ["completed", "canceled", "duplicate"] } } }, first: 250, after: $after) {
    nodes { ${ISSUE} }
    pageInfo { hasNextPage endCursor }
  }
}`;

const DETAIL = `query Detail($id: String!) {
  issue(id: $id) {
    ${ISSUE}
    description
    comments(first: 50) { nodes { id body createdAt user { name } } }
    attachments { nodes { title url } }
  }
}`;

const UPDATE = `mutation Update($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) { success issue { ${ISSUE} } }
}`;

const CREATE = `mutation Create($input: IssueCreateInput!) {
  issueCreate(input: $input) { success issue { ${ISSUE} } }
}`;

const COMMENT = `mutation Comment($input: CommentCreateInput!) {
  commentCreate(input: $input) { success comment { id body createdAt user { name } } }
}`;

const READ_ALL = `mutation ReadAll($input: NotificationEntityInput!, $readAt: DateTime!) {
  notificationMarkReadAll(input: $input, readAt: $readAt) { success }
}`;
const ARCHIVE_ALL = `mutation ArchiveAll($input: NotificationEntityInput!) {
  notificationArchiveAll(input: $input) { success }
}`;
const READ_ONE = `mutation ReadOne($id: String!, $input: NotificationUpdateInput!) {
  notificationUpdate(id: $id, input: $input) { success }
}`;
const ARCHIVE_ONE = `mutation ArchiveOne($id: String!) {
  notificationArchive(id: $id) { success }
}`;

export function createLinear({ key }) {
  let tail = Promise.resolve();
  let waiting = 0;

  function enqueue(fn) {
    waiting++;
    const next = tail.then(fn).finally(() => waiting--);
    tail = next.catch(() => {});
    return next;
  }

  // Linear answers errors as JSON with a 400 or 401 status, so the body is read
  // whatever the status.
  async function gql(query, variables = {}) {
    const r = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: key },
      body: JSON.stringify({ query, variables }),
    });
    let body;
    try {
      body = JSON.parse(await r.text());
    } catch {
      throw new Error(`Linear answered ${r.status}`);
    }
    if (r.status === 401 || body.errors?.[0]?.extensions?.code === "AUTHENTICATION_ERROR") {
      throw new Error(`Linear refused the API key in ~/${KEY_FILE}`);
    }
    if (body.errors?.length) throw new Error(body.errors[0].message);
    if (!r.ok) throw new Error(`Linear answered ${r.status}`);
    return body.data;
  }

  const write = (query, variables) => enqueue(async () => {
    const data = await gql(query, variables);
    if (Object.values(data)[0]?.success === false) throw new Error("Linear didn't apply the change");
    return data;
  });

  return {
    enqueue,
    // Calls still waiting in the queue, the one running included.
    pending: () => waiting,

    async lists() {
      const meta = gql(META);
      const issues = [];
      for (let after = null; ;) {
        const page = (await gql(ISSUES, { after })).issues;
        issues.push(...page.nodes);
        if (!page.pageInfo.hasNextPage) break;
        after = page.pageInfo.endCursor;
      }
      const m = await meta;
      return {
        viewer: m.viewer,
        teams: m.teams.nodes,
        labels: m.issueLabels.nodes,
        issues,
        projects: m.projects.nodes,
        notifications: m.inboxNotifications.nodes,
      };
    },

    issueDetail: async (id) => (await gql(DETAIL, { id })).issue,

    updateIssue: (id, input) => write(UPDATE, { id, input }),
    labels: (id, add, remove) => write(UPDATE, {
      id, input: { ...(add.length ? { addedLabelIds: add } : {}), ...(remove.length ? { removedLabelIds: remove } : {}) },
    }),
    createIssue: ({ teamId, title, projectId }) => write(CREATE, { input: { teamId, title, ...(projectId ? { projectId } : {}) } }),
    comment: (issueId, body) => write(COMMENT, { input: { issueId, body } }),

    // A row of Linear's inbox is a group of related notifications. An issue's
    // group is read and archived whole, or the next load brings it back under a
    // sibling.
    markRead: (n) => (n.issueId
      ? write(READ_ALL, { input: { issueId: n.issueId }, readAt: new Date().toISOString() })
      : write(READ_ONE, { id: n.id, input: { readAt: new Date().toISOString() } })),
    archive: (n) => (n.issueId ? write(ARCHIVE_ALL, { input: { issueId: n.issueId } }) : write(ARCHIVE_ONE, { id: n.id })),
  };
}
