import assert from "node:assert/strict";
import test from "node:test";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import registerNotify from "../dotfiles/pi/.pi/agent/extensions/notify.ts";

test("notification producer queues only an exact background pane", async () => {
	const originalTmux = process.env.TMUX;
	const originalPane = process.env.TMUX_PANE;
	process.env.TMUX = "/tmp/tmux-test,1,0";
	process.env.TMUX_PANE = "%42";

	let location = `work\u001f1\u001f1\n`;
	let clients = "work\n";
	let queue = "%11";
	let handler:
		| ((event: unknown, ctx: ExtensionContext) => Promise<void> | void)
		| undefined;
	const pi = {
		on: (event: string, registered: typeof handler) => {
			if (event === "agent_end") handler = registered;
		},
		exec: async (_command: string, args: string[]) => {
			switch (args[0]) {
				case "display-message":
					assert.equal(args[3], "%42");
					return result(location);
				case "list-clients":
					return result(clients);
				case "show-option":
					return result(queue);
				case "set-option":
					queue = args[3] ?? "";
					return result("");
				default:
					assert.fail(`unexpected tmux command: ${args.join(" ")}`);
			}
		},
	} as unknown as ExtensionAPI;

	try {
		registerNotify(pi);
		assert.ok(handler);

		await handler({}, {} as ExtensionContext);
		assert.equal(queue, "%11");

		location = `work\u001f1\u001f0\n`;
		await handler({}, {} as ExtensionContext);
		assert.equal(queue, "%11,%42");

		await handler({}, {} as ExtensionContext);
		assert.equal(queue, "%11,%42");

		queue = "";
		location = `work\u001f0\u001f1\n`;
		await handler({}, {} as ExtensionContext);
		assert.equal(queue, "%42");

		queue = "";
		location = `work\u001f1\u001f1\n`;
		clients = "other\n";
		await handler({}, {} as ExtensionContext);
		assert.equal(queue, "%42");
	} finally {
		if (originalTmux === undefined) delete process.env.TMUX;
		else process.env.TMUX = originalTmux;
		if (originalPane === undefined) delete process.env.TMUX_PANE;
		else process.env.TMUX_PANE = originalPane;
	}
});

test("notification producer does nothing outside tmux", async () => {
	const originalTmux = process.env.TMUX;
	const originalPane = process.env.TMUX_PANE;
	delete process.env.TMUX;
	delete process.env.TMUX_PANE;
	let calls = 0;
	let handler:
		| ((event: unknown, ctx: ExtensionContext) => Promise<void> | void)
		| undefined;
	const pi = {
		on: (event: string, registered: typeof handler) => {
			if (event === "agent_end") handler = registered;
		},
		exec: async () => {
			calls += 1;
			return result("");
		},
	} as unknown as ExtensionAPI;

	try {
		registerNotify(pi);
		assert.ok(handler);
		await handler({}, {} as ExtensionContext);
		assert.equal(calls, 0);
	} finally {
		if (originalTmux === undefined) delete process.env.TMUX;
		else process.env.TMUX = originalTmux;
		if (originalPane === undefined) delete process.env.TMUX_PANE;
		else process.env.TMUX_PANE = originalPane;
	}
});

function result(stdout: string) {
	return { stdout, stderr: "", code: 0, killed: false };
}
