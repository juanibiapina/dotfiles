import * as path from "node:path";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { formatUnknownError } from "./protocol.ts";
import { type SocketServer, startSocketServer } from "./socket-server.ts";
import {
	createStatusStore,
	defaultPiLiveDir,
	type PiSessionState,
	type PiSessionStatus,
	type StatusStore,
	type TmuxLocation,
} from "./status-store.ts";

export type PiLiveOptions = {
	dataDir?: string;
	pid?: number;
	paneId?: string;
	now?: () => Date;
};

type ActiveRuntime = {
	socket: SocketServer;
	store: StatusStore;
	sessionId: string;
	startedAt: string;
	state: PiSessionState;
	tmux?: TmuxLocation;
	exitHandler: () => void;
};

export function registerPiLive(
	pi: ExtensionAPI,
	options: PiLiveOptions = {},
): void {
	const dataDir = options.dataDir ?? defaultPiLiveDir();
	const pid = options.pid ?? process.pid;
	const now = options.now ?? (() => new Date());
	const paneId =
		options.paneId === undefined ? process.env.TMUX_PANE : options.paneId;
	const store = createStatusStore(dataDir);

	let active: ActiveRuntime | undefined;
	let latestContext: ExtensionContext | undefined;
	let operations = Promise.resolve();

	function report(ctx: ExtensionContext, message: string): void {
		if (ctx.hasUI) {
			ctx.ui.notify(message, "error");
			return;
		}
		console.error(message);
	}

	function enqueue(
		ctx: ExtensionContext,
		operation: () => Promise<void>,
	): Promise<void> {
		const result = operations.then(operation, operation);
		operations = result.catch((error) =>
			report(ctx, `pi-live: ${formatUnknownError(error)}`),
		);
		return result.catch(() => undefined);
	}

	async function start(ctx: ExtensionContext): Promise<void> {
		await stop();
		latestContext = ctx;

		let socket: SocketServer | undefined;
		try {
			socket = await startSocketServer({
				dataDir,
				pid,
				pi,
				getContext: () => {
					if (!latestContext) throw new Error("Pi live context is unavailable");
					return latestContext;
				},
				onError: (message) => report(ctx, message),
			});

			const sessionId = ctx.sessionManager.getSessionId();
			const startedAt = now().toISOString();
			const tmux = await readTmuxLocation(pi, paneId);
			const state: PiSessionState = ctx.isIdle() ? "idle" : "working";
			let runtime: ActiveRuntime;
			const exitHandler = () => {
				try {
					store.removeSync(runtime.sessionId);
				} catch {
					// Process-exit cleanup is best effort.
				}
				try {
					socket?.removeFileSync();
				} catch {
					// Process-exit cleanup is best effort.
				}
			};

			await store.write(
				buildStatus(
					pi,
					ctx,
					socket.socketPath,
					pid,
					sessionId,
					startedAt,
					state,
					tmux,
					now,
				),
			);
			runtime = {
				socket,
				store,
				sessionId,
				startedAt,
				state,
				tmux,
				exitHandler,
			};
			active = runtime;
			process.once("exit", exitHandler);
		} catch (error) {
			await socket?.close();
			throw error;
		}
	}

	async function update(
		ctx: ExtensionContext,
		state?: PiSessionState,
	): Promise<void> {
		if (!active) return;
		latestContext = ctx;
		if (state) active.state = state;

		const sessionId = ctx.sessionManager.getSessionId();
		if (sessionId !== active.sessionId) {
			await active.store.remove(active.sessionId);
			active.sessionId = sessionId;
			active.startedAt = now().toISOString();
		}

		await active.store.write(
			buildStatus(
				pi,
				ctx,
				active.socket.socketPath,
				pid,
				active.sessionId,
				active.startedAt,
				active.state,
				active.tmux,
				now,
			),
		);
	}

	async function stop(): Promise<void> {
		const current = active;
		active = undefined;
		latestContext = undefined;
		if (!current) return;

		process.off("exit", current.exitHandler);
		try {
			await current.store.remove(current.sessionId);
		} finally {
			await current.socket.close();
		}
	}

	pi.on("session_start", async (_event, ctx) => enqueue(ctx, () => start(ctx)));
	pi.on("session_info_changed", async (_event, ctx) =>
		enqueue(ctx, () => update(ctx)),
	);
	pi.on("agent_start", async (_event, ctx) =>
		enqueue(ctx, () => update(ctx, "working")),
	);
	pi.on("agent_settled", async (_event, ctx) =>
		enqueue(ctx, () => update(ctx, "idle")),
	);
	pi.on("session_shutdown", async (_event, ctx) => enqueue(ctx, () => stop()));
}

function buildStatus(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	socketPath: string,
	pid: number,
	sessionId: string,
	startedAt: string,
	state: PiSessionState,
	tmux: TmuxLocation | undefined,
	now: () => Date,
): PiSessionStatus {
	const name = pi.getSessionName();
	const sessionFile = ctx.sessionManager.getSessionFile();
	return {
		version: 1,
		sessionId,
		...(name ? { name } : {}),
		pid,
		cwd: path.resolve(ctx.cwd),
		...(sessionFile ? { sessionFile } : {}),
		socketPath,
		startedAt,
		updatedAt: now().toISOString(),
		state,
		...(tmux ? { tmux } : {}),
	};
}

async function readTmuxLocation(
	pi: ExtensionAPI,
	paneId: string | undefined,
): Promise<TmuxLocation | undefined> {
	if (!paneId || !process.env.TMUX) return undefined;

	const separator = "\u001f";
	const { stdout, code } = await pi.exec("tmux", [
		"display-message",
		"-p",
		"-t",
		paneId,
		`#{pane_id}${separator}#{session_name}${separator}#{window_index}${separator}#{window_name}`,
	]);
	if (code !== 0) return undefined;

	const [resolvedPaneId, sessionName, windowIndexRaw, windowName] = stdout
		.trim()
		.split(separator);
	const windowIndex = Number(windowIndexRaw);
	if (
		!resolvedPaneId ||
		!sessionName ||
		!Number.isInteger(windowIndex) ||
		windowName === undefined
	)
		return undefined;
	return { paneId: resolvedPaneId, sessionName, windowIndex, windowName };
}
