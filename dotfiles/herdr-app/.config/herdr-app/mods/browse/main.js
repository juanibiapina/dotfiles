// Like tmux's prefix-g (`dev tmux browse`): open the focused pane's repo or PR
// on GitHub, in the Mac's browser, for spaces on any machine.
//
// Outside a GitButler workspace it opens the current branch's PR, else the
// repository. In a GitButler workspace it lists the applied branches (opening
// the only one at once) and opens the chosen branch's PR; without a PR, the
// branch's page if it was pushed, otherwise the repository.
//
// The slow part is asking GitHub for PRs, so PR links are cached per repo in
// shared "browse.prs" and refreshed in the background while the list shows.
// A cache miss asks for that one branch before opening.

import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { closeOverlay, exec, focused, props, setShared, shared, spaces, theme } from "herdr";

// One round trip to the space's machine: remote, branch, and GitButler's branches.
const INFO = `git remote get-url origin; git branch --show-current
[ "$(git branch --show-current)" = gitbutler/workspace ] && but status --json`;

// gh with the project's direnv environment, as `dev tmux browse` loads it.
const GH = `eval "$(direnv export sh 2>/dev/null)"; exec gh "$@"`;

export default class Browse extends View {
  init(_props, cx) {
    this.items = null;
    this.at = 0;
    this.handle = cx.focus_handle();
    cx.timer.after(0, () => this.handle.focus());

    const f = focused();
    const space = spaces().find((s) => s.id === f?.space) ?? spaces().find((s) => s.active);
    this.on = space?.machine ?? null;
    this.cwd = f?.cwd || space?.folder;

    cx.spawn(async (cx) => {
      const r = await exec("sh", ["-c", INFO], { cwd: this.cwd, on: this.on }).catch(() => null);
      const [remote = "", branch = "", ...rest] = (r?.stdout ?? "").split("\n");
      this.repo = githubRepo(remote.trim());
      if (!this.repo) return this.dismiss();
      const items = branch.trim() === "gitbutler/workspace" ? appliedBranches(rest.join("\n")) : branch.trim() ? [{ name: branch.trim() }] : [];
      if (items.length === 0) return this.openUrl(this.repo.url);
      if (items.length === 1) return this.openBranch(items[0]);
      this.items = [...items, { name: "(repository)", repository: true }];
      cx.notify();
      await this.refreshPrs();
      cx.notify();
    });
  }

  dismiss() {
    closeOverlay(props().overlay);
  }

  openUrl(url) {
    exec("open", [url]);
    this.dismiss();
  }

  gh(args) {
    return exec("sh", ["-c", GH, "sh", ...args, "-R", this.repo.slug], { cwd: this.cwd, on: this.on });
  }

  cache() {
    return (shared("browse.prs") ?? {})[this.repo.slug] ?? {};
  }

  store(prs) {
    const all = shared("browse.prs") ?? {};
    setShared("browse.prs", { ...all, [this.repo.slug]: { ...all[this.repo.slug], ...prs } });
  }

  async refreshPrs() {
    const r = await this.gh(["pr", "list", "--state", "all", "--limit", "100", "--json", "headRefName,url,number,title"]).catch(() => null);
    if (r?.code !== 0) return;
    const prs = {};
    for (const p of JSON.parse(r.stdout).reverse()) prs[p.headRefName] = { url: p.url, number: p.number, title: p.title };
    this.store(prs);
  }

  async openBranch(item) {
    if (item.repository) return this.openUrl(this.repo.url);
    const cached = this.cache()[item.name];
    if (cached) return this.openUrl(cached.url);
    const r = await this.gh(["pr", "view", item.name, "--json", "url,number,title"]).catch(() => null);
    if (r?.code === 0) {
      const p = JSON.parse(r.stdout);
      this.store({ [item.name]: p });
      return this.openUrl(p.url);
    }
    if (!item.status || item.status === "completelyUnpushed") return this.openUrl(this.repo.url);
    this.openUrl(`${this.repo.url}/tree/${item.name}`);
  }

  key(e, cx) {
    cx.stop_propagation();
    if (!this.items) return e.key === "escape" && this.dismiss();
    const n = this.items.length;
    const k = e.key;
    const ctrl = e.modifiers?.control;
    if (k === "escape") return this.dismiss();
    if (k === "enter") return this.openBranch(this.items[this.at]);
    if (/^[1-9]$/.test(k) && Number(k) <= n) return this.openBranch(this.items[Number(k) - 1]);
    if (k === "down" || k === "j" || (ctrl && k === "n")) this.at = (this.at + 1) % n;
    else if (k === "up" || k === "k" || (ctrl && k === "p")) this.at = (this.at + n - 1) % n;
    else return;
    cx.notify();
  }

  render() {
    const root = v_flex().id("browse").track_focus(this.handle).on_key_down((e, cx) => this.key(e, cx));
    if (!this.items) return root;
    const t = theme();
    const prs = this.cache();
    const row = (item, i) => {
      const pr = prs[item.name];
      return h_flex()
        .id(`b-${i}`)
        .h(30)
        .px(8)
        .gap(10)
        .items_center()
        .rounded(6)
        .cursor_pointer()
        .when(i === this.at, (el) => el.bg(t.selected))
        .hover((el) => el.bg(t.hover))
        .on_click(() => this.openBranch(item))
        .child(div().w(12).text_color(t.dim).child(String(i + 1)))
        .child(div().flex_none().text_color(item.repository ? t.muted : t.foreground).child(item.name))
        .child(div().flex_1().truncate().text_size(11).text_color(t.dim).child(pr ? `#${pr.number} ${pr.title}` : ""));
    };
    return root
      .w_full()
      .p(8)
      .gap(2)
      .rounded(8)
      .border(1)
      .border_color(t.border)
      .bg(t.popover)
      .text_size(13)
      .child(h_flex().px(8).pb(4).justify_between().text_size(11).text_color(t.dim).child(this.repo.slug).child("↵ open · 1–9 · Esc"))
      .children(this.items.map(row));
  }
}

function githubRepo(remote) {
  const m = remote.match(/github\.com[^:/]*[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!m) return null;
  const slug = `${m[1]}/${m[2]}`;
  return { slug, url: `https://github.com/${slug}` };
}

function appliedBranches(json) {
  try {
    return JSON.parse(json).stacks.flatMap((s) => s.branches.map((b) => ({ name: b.name, status: b.branchStatus })));
  } catch {
    return [];
  }
}
