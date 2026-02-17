/**
 * Ralph state types and phase ordering.
 */

export type Phase = "plan" | "build" | "document" | "commit" | "pr" | "wait_pr" | "update_prompt";

export const PHASE_ORDER: Phase[] = ["plan", "build", "document", "commit", "pr", "wait_pr", "update_prompt"];

/** Persisted state for the ralph loop */
export interface RalphState {
	/** Whether the ralph loop is active */
	active: boolean;
	/** Current iteration number */
	iteration: number;
	/** Current phase within the iteration */
	phase: Phase;
}
