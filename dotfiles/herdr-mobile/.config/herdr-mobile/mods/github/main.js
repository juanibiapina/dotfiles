// GitHub: notifications and the pull requests, issues, releases and CI runs
// they point at, through `gh` on the definition machine.
//
// One mod, many faces, chosen by props:
//   { header: true }              the header: a bell with the unread count (it polls) and Settings
//   {}                            the inbox: notifications, and a Work tab (reviews, your PRs, issues)
//   { pr: { repo, number } }      a pull request: checks first, merge state, description, activity
//   { files: { repo, number } }   its files and diffs
//   { issue: { repo, number } }   an issue
//   { ref: { repo, number } }     a #123 link: a PR or an issue
//   { release: { repo, id|tag } } a release
//   { ci: { repo, workflow, branch } }  a CI notification: the workflow's runs
//   { run: { repo, id } }         a run's jobs;  { log: { repo, run, job, name, failed } } a job's log
//   { sheet: "<name>", ... }      a sheet: item, compose, merge, more, check, closeIssue, agent
// Pages opened from a notification also get { thread: notification }.
// Shared state: "github.items" (notifications), "github.work", "github.me",
// "github.bump" (moves after a change, so open pages reload).

import { View } from "herdr-ui";
import { theme, props, notify, run } from "herdr";
import { bump, bumped, linkTarget, errorText } from "./api.js";
import { header, inbox, itemSheet, open } from "./inbox.js";
import { prPage, filesPage, issuePage, refPage, releasePage, ciPage, runPage, logPage } from "./pages.js";
import * as sheets from "./sheets.js";

const PAGES = { pr: prPage, files: filesPage, issue: issuePage, ref: refPage, release: releasePage, ci: ciPage, run: runPage, log: logPage };
const SHEETS = { item: itemSheet, compose: sheets.compose, merge: sheets.merge, more: sheets.more, check: sheets.check, closeIssue: sheets.closeIssue, agent: sheets.agent };

function face(p) {
  if (p.header) return { kind: "header", f: header };
  if (p.sheet) return { kind: "sheet", f: SHEETS[p.sheet] };
  if (p.item) return { kind: "sheet", f: itemSheet };
  const k = Object.keys(PAGES).find((k) => p[k]);
  return k ? { kind: "page", f: PAGES[k] } : { kind: "inbox", f: inbox };
}

export default class GitHub extends View {
  init(_props, cx) {
    const p = props();
    const { kind, f } = face(p);
    if (!f) throw new Error(`no GitHub sheet called ${p.sheet}`);
    this.kind = kind;
    this.f = f;
    this.expanded = new Set();
    this.seen = bumped();
    this.toggle = (key, cx) => {
      if (this.expanded.has(key)) this.expanded.delete(key);
      else this.expanded.add(key);
      this.ver = (this.ver ?? 0) + 1;
      cx.notify();
    };
    if (kind === "sheet") f.init?.(this, cx);
    else if (kind === "page") f.init(this, p, cx);
    else f.init(this, cx);
  }

  /** Runs a change from a page's button: spinner on it, a toast, then every page reloads. */
  act(cx, key, f, ok) {
    if (this.busy) return;
    this.busy = key;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        await f();
        notify({ title: ok, level: "success" });
        this.busy = null;
        bump();
      } catch (e) {
        this.busy = null;
        notify({ title: "GitHub said no", body: errorText(e), level: "error", timeout: 8000 });
      }
      cx.notify();
    });
  }

  /** Reuses the last tree while deps hold: the app draws again on every agent change. */
  memo(deps, build) {
    const d = [...deps, this.ver, this.busy, this.loading, this.error, this.data];
    if (this.memoDeps && d.length === this.memoDeps.length && d.every((x, i) => x === this.memoDeps[i])) return this.memoEl;
    this.memoDeps = d;
    this.memoEl = build();
    return this.memoEl;
  }

  /** A tapped link: GitHub pages open here, anything else is copied. */
  link(url) {
    const r = url.match(/^(?:([\w.-]+\/[\w.-]+))?#(\d+)$/);
    if (r) return open({ ref: { repo: r[1] ?? this.repo, number: Number(r[2]) } }, `#${r[2]}`);
    const tg = linkTarget(url);
    if (tg) {
      const n = tg.pr?.number ?? tg.ref?.number;
      return open(tg, n ? `#${n}` : tg.release ? "Release" : "Run");
    }
    return run("clipboard.copy", { text: url }).then(() => notify({ title: "Link copied", body: url }));
  }

  render(cx) {
    if (this.kind === "page" && bumped() !== this.seen) {
      this.seen = bumped();
      this.reload?.(cx);
    }
    const t = theme();
    if (this.kind === "page") return this.memo([t, this.resolved], () => this.f.render(this, t, cx));
    return this.f.render(this, t, cx);
  }
}
