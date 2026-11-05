#!/usr/bin/env python3
"""Exercise the macOS Pi launcher through its process interface."""

import os
import pathlib
import signal
import subprocess
import sys
import tempfile
import time
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "nix/modules/pi/pi-launcher.c"
INFO_PLIST = ROOT / "nix/modules/pi/Info.plist"
INSTALL_SCRIPT = ROOT / "nix/modules/pi/install-pi-app.sh"


@unittest.skipUnless(sys.platform == "darwin", "the Pi launcher uses macOS spawn attributes")
class PiLauncherTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.dir = pathlib.Path(self.temp.name)
        self.events = self.dir / "events"
        self.stub = self.dir / "pi-real"
        self.stub.write_text(
            "#!/bin/sh\n"
            'printf "%s %s\\n" "$$" "$*" >> "$PI_TEST_EVENTS"\n'
            'if [ "$PI_TEST_MODE" = crash ] && [ "$#" -eq 0 ]; then exit 7; fi\n'
            'if [ "$PI_TEST_MODE" = stubborn ]; then trap "" TERM HUP; fi\n'
            'if [ "$PI_TEST_MODE" = crash ]; then exit 0; fi\n'
            'while :; do sleep 1; done\n'
        )
        self.stub.chmod(0o755)
        self.launcher = self.dir / "pi"
        subprocess.run(
            ["clang", "-Wall", "-Wextra", "-Werror", "-O2", f'-DPI_REAL="{self.stub}"',
             str(SOURCE), "-o", str(self.launcher)],
            check=True,
        )
        self.env = dict(os.environ, PI_TEST_EVENTS=str(self.events))

    def wait_for(self, predicate, description):
        for _ in range(100):
            if predicate():
                return
            time.sleep(0.05)
        self.fail(f"timed out waiting for {description}")

    def recorded_children(self):
        if not self.events.exists():
            return []
        return [int(line.split()[0]) for line in self.events.read_text().splitlines()]

    def alive(self, pid):
        try:
            os.kill(pid, 0)
            return True
        except ProcessLookupError:
            return False

    def test_tmux_close_reaps_child_without_restarting(self):
        self.env["PI_TEST_MODE"] = "stubborn"
        session = f"pi-launcher-test-{os.getpid()}"
        subprocess.run(["tmux", "new-session", "-d", "-s", session,
                        "-e", f"PI_TEST_EVENTS={self.events}",
                        "-e", "PI_TEST_MODE=stubborn",
                        f"exec {self.launcher}"], check=True)
        try:
            pane_pid = int(subprocess.check_output(
                ["tmux", "display-message", "-p", "-t", session, "#{pane_pid}"], text=True
            ))
            self.wait_for(lambda: bool(self.recorded_children()), "Pi child")
            child_pid = self.recorded_children()[0]
            subprocess.run(["tmux", "kill-session", "-t", session], check=True)
            self.wait_for(lambda: not self.alive(pane_pid), "launcher exit")
            self.assertFalse(self.alive(child_pid), "Pi child survived tmux close")
            self.assertEqual(self.recorded_children(), [child_pid], "Pi restarted after tmux close")
        finally:
            subprocess.run(["tmux", "kill-session", "-t", session],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if 'pane_pid' in locals() and self.alive(pane_pid):
                os.kill(pane_pid, signal.SIGKILL)
            for pid in self.recorded_children():
                if self.alive(pid):
                    os.kill(pid, signal.SIGKILL)

    def test_crash_recovers_on_open_terminal(self):
        self.env["PI_TEST_MODE"] = "crash"
        result = subprocess.run([str(self.launcher)], env=self.env,
                                stdin=subprocess.DEVNULL, capture_output=True, timeout=5)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.recorded_children()), 2)
        self.assertIn("--continue Please continue.", self.events.read_text())



@unittest.skipUnless(sys.platform == "darwin", "Pi.app is installed on macOS only")
class PiAppInstallTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = pathlib.Path(self.temp.name)
        self.keychain = self.home / "pi-app-test.keychain-db"
        subprocess.run(["security", "create-keychain", "-p", "test", str(self.keychain)], check=True)
        self.addCleanup(subprocess.run, ["security", "delete-keychain", str(self.keychain)],
                        stderr=subprocess.DEVNULL)
        subprocess.run(["security", "unlock-keychain", "-p", "test", str(self.keychain)], check=True)
        self.env = dict(os.environ, HOME=str(self.home), PI_APP_KEYCHAIN=str(self.keychain))

    def build_app(self, name, variant):
        app = self.home / name / "Pi.app"
        (app / "Contents/MacOS").mkdir(parents=True)
        (app / "Contents/Info.plist").write_bytes(INFO_PLIST.read_bytes())
        subprocess.run(["clang", "-O2", f"-DPI_REAL=\"/{variant}\"", str(SOURCE),
                        "-o", str(app / "Contents/MacOS/pi")], check=True)
        return app

    def install(self, app):
        subprocess.run(["bash", str(INSTALL_SCRIPT), str(app)], env=self.env, check=True)
        installed = self.home / ".local/share/pi-launcher/Pi.app"
        return subprocess.run(["codesign", "-d", "-r-", str(installed)],
                              capture_output=True, text=True, check=True).stdout

    def test_rebuilt_launcher_keeps_its_signing_requirement(self):
        first = self.install(self.build_app("build1", "one"))
        second = self.install(self.build_app("build2", "two"))
        self.assertIn('identifier "com.juanibiapina.pi" and certificate leaf', first)
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()
