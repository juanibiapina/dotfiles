/**
 * Ralph state types and session path helpers.
 *
 * Session files live under:
 *   ~/.pi/agent/sessions/ralph/<project-slug>/iter-<N>.jsonl        (L2 iteration)
 *   ~/.pi/agent/sessions/ralph/<project-slug>/iter-<N>-<phase>.jsonl (L3 phases)
 */

import * as os from "node:os";
import * as path from "node:path";

/** Persisted state for the L1 orchestrator */
export interface RalphState {
	/** Whether the ralph loop is active */
	active: boolean;
	/** Current iteration number (incremented by ralph_next) */
	iteration: number;
}

/**
 * Derive a filesystem-safe slug from a working directory.
 *
 * /Users/foo/workspace/org/project → org--project
 * /Users/foo/some/path             → some--path
 */
export function projectSlug(cwd: string): string {
	const home = os.homedir();
	const workspace = path.join(home, "workspace");

	let relative: string;
	if (cwd.startsWith(workspace + path.sep)) {
		relative = cwd.slice(workspace.length + 1);
	} else if (cwd.startsWith(home + path.sep)) {
		relative = cwd.slice(home.length + 1);
	} else {
		relative = cwd;
	}

	return relative.replace(/\//g, "--");
}

/** Base directory for ralph session files for a given project */
export function getSessionDir(cwd: string): string {
	return path.join(os.homedir(), ".pi", "agent", "sessions", "ralph", projectSlug(cwd));
}

/**
 * Full path to a session file.
 *
 * getSessionPath(cwd, 3)          → .../iter-3.jsonl        (L2 iteration)
 * getSessionPath(cwd, 3, "plan")  → .../iter-3-plan.jsonl   (L3 phase)
 * getSessionPath(cwd, 3, "fix-1") → .../iter-3-fix-1.jsonl  (L3 fix sub-session)
 */
export function getSessionPath(cwd: string, iteration: number, phase?: string): string {
	const dir = getSessionDir(cwd);
	const suffix = phase ? `-${phase}` : "";
	return path.join(dir, `iter-${iteration}${suffix}.jsonl`);
}
