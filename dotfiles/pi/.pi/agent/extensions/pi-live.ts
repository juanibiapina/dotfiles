/**
 * Publish this live Pi session through a machine-local status record and Unix socket.
 *
 * Status: ~/.local/share/pi/status/<session-id>.json
 * Socket: ~/.local/share/pi/sockets/<pid>-<random>.sock
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerPiLive } from "../lib/pi-live/runtime.ts";

export default function (pi: ExtensionAPI): void {
	registerPiLive(pi);
}
