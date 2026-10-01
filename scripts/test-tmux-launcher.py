#!/usr/bin/env python3
"""Run the launcher against real tmux clients on a private socket."""

import fcntl
import os
from pathlib import Path
import pty
import select
import struct
import subprocess
import tempfile
import termios
import time

REPO = Path(__file__).resolve().parents[1]


def wait_until(predicate, description, timeout=8):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.02)
    raise AssertionError(f"Timed out: {description}")


class Client:
    def __init__(self, socket, session, width=120, height=36):
        self.master, slave = pty.openpty()
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", height, width, 0, 0))
        self.name = os.ttyname(slave)
        self.output = b""
        env = dict(os.environ, TERM="xterm-256color")
        env.pop("TMUX", None)
        env.pop("TMUX_PANE", None)

        def terminal():
            os.setsid()
            fcntl.ioctl(slave, termios.TIOCSCTTY, 0)

        self.process = subprocess.Popen(
            ["tmux", "-S", socket, "attach-session", "-t", session],
            stdin=slave, stdout=slave, stderr=slave, env=env, preexec_fn=terminal,
        )
        os.close(slave)

    def read(self):
        while select.select([self.master], [], [], 0)[0]:
            try:
                chunk = os.read(self.master, 65536)
            except OSError:
                break
            if not chunk:
                break
            self.output += chunk
        return self.output

    def send(self, text):
        os.write(self.master, text)

    def close(self):
        os.close(self.master)
        if self.process.poll() is None:
            self.process.kill()
        self.process.wait(timeout=3)


def main():
    clients = []
    launchers = []
    with tempfile.TemporaryDirectory(prefix="tmux launcher ") as directory:
        socket = str(Path(directory) / "server socket")

        def tmux(*args):
            return subprocess.check_output(
                ["tmux", "-S", socket, *args], stderr=subprocess.STDOUT, text=True,
            ).strip()

        def pane_state(pane):
            return tmux("display-message", "-p", "-t", pane,
                        "#{window_zoomed_flag}:#{window_panes}")

        try:
            tmux("-f", str(REPO / "dotfiles/tmux/.tmux.conf"),
                 "new-session", "-d", "-s", "original", "-c", directory,
                 "-x", "120", "-y", "36")
            tmux("set-option", "-g", "side-status", "off")
            tmux("set-option", "-g", "status", "off")
            # Notifications are unrelated to the launcher and do not belong in
            # an isolated test server's hooks.
            for hook in ("client-session-changed", "session-window-changed",
                         "after-select-pane", "client-focus-in"):
                tmux("set-hook", "-gu", hook)
            pane = tmux("display-message", "-p", "-t", "original:", "#{pane_id}")
            tmux("split-window", "-h", "-t", pane, "-c", directory)
            tmux("select-pane", "-t", pane)
            tmux("new-session", "-d", "-s", "other-session", "-c", directory)
            other_pane = tmux("display-message", "-p", "-t", "other-session:", "#{pane_id}")
            tmux("split-window", "-h", "-t", other_pane)
            original = Client(socket, "original")
            other = Client(socket, "other-session")
            clients.extend([original, other])
            wait_until(lambda: original.name in tmux("list-clients", "-F", "#{client_name}"),
                       "original client attaches")
            wait_until(lambda: other.name in tmux("list-clients", "-F", "#{client_name}"),
                       "other client attaches")

            def start(width=120, height=36):
                wait_until(lambda: not tmux("display-message", "-p", "-t", pane,
                                            "#{window_modal_pane}"), "previous popup removed")
                fcntl.ioctl(original.master, termios.TIOCSWINSZ,
                            struct.pack("HHHH", height, width, 0, 0))
                wait_until(lambda: tmux("display-message", "-p", "-c", original.name,
                                        "#{client_width}") == str(width), "terminal resize")
                # tmux may still be flushing the previous overlay's final frame.
                time.sleep(0.15)
                original.read()
                original.output = b""
                other.read()
                other.output = b""
                env = dict(os.environ, FZF_DEFAULT_OPTS="--select-1 --multi --preview false",
                           FZF_DEFAULT_OPTS_FILE="/missing/launcher-options")
                process = subprocess.Popen(
                    ["dev", "tmux", "launcher", socket, original.name, pane],
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env,
                )
                launchers.append(process)
                def ready():
                    original.read()
                    other.read()
                    modal = tmux("display-message", "-p", "-t", pane, "#{window_modal_pane}")
                    if not modal:
                        return False
                    screen = tmux("capture-pane", "-p", "-t", modal)
                    return "Commands >" in screen and "14/14" in screen

                wait_until(ready, "launcher opens")
                assert b"Commands >" not in other.read(), "popup opened on the other client"
                return process

            def finish(process, keys):
                original.send(keys)
                try:
                    wait_until(lambda: (original.read(), other.read(), process.poll())[-1] is not None,
                               "launcher closes")
                except AssertionError:
                    print(repr(original.read()[-6000:]))
                    raise
                stdout, stderr = process.communicate()
                assert process.returncode == 0, (stdout, stderr)

            tmux("resize-pane", "-Z", "-t", pane)
            before = pane_state(pane)
            finish(start(), b"\x1b")
            assert pane_state(pane) == before, "Escape changed zoom or panes"
            finish(start(), b"\x03")
            assert pane_state(pane) == before, "Ctrl+C changed zoom or panes"
            print("PASS: Escape and Ctrl+C preserve zoom and panes")

            finish(start(), b"zzzz-no-such-command\r")
            assert pane_state(pane) == before, "empty results changed zoom or panes"
            print("PASS: Enter with no matches changes no state")

            tmux("resize-pane", "-Z", "-t", pane)
            other_before = pane_state(other_pane)
            distractor = tmux("new-window", "-P", "-F", "#{pane_id}",
                              "-t", "other-session:", "-c", directory)
            process = start()
            tmux("switch-client", "-c", other.name, "-t", distractor)
            finish(process, b"maximize\r")
            wait_until(lambda: pane_state(pane).startswith("1:"), "original pane zooms")
            assert pane_state(other_pane) == other_before
            assert tmux("display-message", "-p", "-c", original.name, "#{pane_id}") == pane
            print("PASS: maximize targets the original pane after focus changes")

            tmux("resize-pane", "-Z", "-t", pane)
            finish(start(), b"split horizontally\r")
            wait_until(lambda: pane_state(pane) == "0:3", "horizontal split")
            assert pane_state(other_pane) == other_before
            print("PASS: split affects only the original window")

            # The launcher must be gone before the existing session picker opens.
            finish(start(), b"switch session\r")
            wait_until(lambda: b"other-session" in original.read(), "second picker opens")
            original.send(b"\x1b")
            wait_until(lambda: "1" not in tmux("list-panes", "-a", "-F",
                                               "#{pane_floating_flag}").splitlines(),
                       "second picker closes")
            original.read()
            assert tmux("display-message", "-p", "-c", original.name,
                        "#{session_name}") == "original"
            print("PASS: session picker opens and cancels after launcher closes")

            for query, label in ((b"github", "Browse repository / PR on GitHub"),
                                 (b"project", "Open project")):
                process = start()
                original.send(query)

                def matched():
                    original.read()
                    modal = tmux("display-message", "-p", "-t", pane, "#{window_modal_pane}")
                    screen = tmux("capture-pane", "-p", "-t", modal)
                    return (query.decode() in screen and label in screen
                            and "Zoom / maximize pane" not in screen)

                wait_until(matched, f"{query.decode()} finds its action")
                finish(process, b"\x1b")
            print("PASS: github and project find their actions")

            finish(start(width=60, height=20), b"\x1b")
            print("PASS: launcher works at 60x20")

            process = start()
            original.send(b"rename window\r")
            wait_until(lambda: b"(rename-window)" in original.read(), "native rename prompt opens")
            finish(process, b"launcher test window\r")
            wait_until(lambda: tmux("display-message", "-p", "-t", pane,
                                    "#{window_name}") == "launcher test window",
                       "native rename prompt works")
            print("PASS: rename uses the native prompt")

            original.send(b"\x00k")

            def binding_opened():
                original.read()
                modal = tmux("display-message", "-p", "-t", pane, "#{window_modal_pane}")
                return bool(modal) and "Commands >" in tmux("capture-pane", "-p", "-t", modal)

            wait_until(binding_opened, "Ctrl+Space then k opens launcher")
            original.send(b"\x1b")
            wait_until(lambda: not tmux("display-message", "-p", "-t", pane,
                                        "#{window_modal_pane}"), "bound launcher closes")
            print("PASS: Ctrl+Space then k opens the installed launcher")
        finally:
            for process in launchers:
                if process.poll() is None:
                    process.terminate()
                    process.wait(timeout=3)
            subprocess.run(["tmux", "-S", socket, "kill-server"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            for client in clients:
                client.close()


if __name__ == "__main__":
    main()
