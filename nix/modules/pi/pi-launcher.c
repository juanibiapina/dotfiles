// pi-launcher: make macOS TCC attribute pi's file access to a stable, pi-only
// identity instead of the terminal emulator.
//
// Why this exists: pi runs inside tmux. A tmux server daemonizes and reparents
// to launchd, and its TCC "responsible process" is frozen at server-launch time
// to whichever terminal started it (Ghostty, xterm, ...). So macOS prompts for,
// and grants file access to, the terminal - not pi - and the identity flips
// depending on where the tmux server was born. Granting the terminal Full Disk
// Access is both too coarse (every command in that terminal inherits it) and
// fragile (breaks when the server starts elsewhere).
//
// How it works (one hop):
//   1. First entry re-execs ITSELF in place via posix_spawn with
//      POSIX_SPAWN_SETEXEC and the private responsibility_spawnattrs_setdisclaim
//      attribute. This keeps the same pid but makes it responsible for itself.
//   2. The re-exec'd process (still this launcher's code) runs the real pi as a
//      CHILD and waits. It must NOT exec pi: a process's TCC identity is read
//      live from its running image, so exec'ing pi here would turn this pid's
//      code into node and TCC would attribute file access to node (churny,
//      shared). Staying alive as launcher code makes THIS binary pi's
//      responsible identity. Verified with
//      responsibility_get_pid_responsible_for_pid: pi's process reports its
//      responsible pid as this launcher, whose code is this binary.
//
// This is the disclaim technique (cf. torarnv/disclaim), specialized to hold a
// dedicated pi-only identity rather than letting the exec'd target (node) own
// the grant.
//
// Second responsibility: crash recovery. Because the launcher stays alive
// waiting on pi, it can also notice when pi dies non-cleanly (a signal, or a
// non-zero exit from an uncaught exception) and relaunch it on the previous
// session with a "please continue" message, so a crash does not strand the user
// at a broken terminal. See run_pi / restore_terminal below.
//
// The real pi is reached through the nix-darwin system profile symlink so this
// launcher never embeds pi's version-specific store path, which would churn its
// own hash. Grant Full Disk Access to this binary once; re-grant only when the
// launcher itself is rebuilt (a C-toolchain bump), not on pi releases.

#include <dlfcn.h>
#include <errno.h>
#include <mach-o/dyld.h>
#include <signal.h>
#include <spawn.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <termios.h>
#include <unistd.h>

#ifndef PI_REAL
#define PI_REAL "/run/current-system/sw/bin/pi-real"
#endif
#define FLAG "PI_DISCLAIMED"

// Crash recovery: when pi exits non-cleanly (a signal, or a non-zero exit from
// an uncaught exception) instead of a normal quit, relaunch it on the previous
// session and ask the agent to continue, so a crash lands the user back in a
// working pi instead of a broken shell. CRASH_MESSAGE is queued as the first
// user turn of the resumed session; MAX_RESTARTS caps consecutive relaunches so
// a crash-on-resume cannot loop forever.
#define CRASH_MESSAGE "Please continue. There was a crash in PI itself."
#define MAX_RESTARTS 3

extern char **environ;

typedef int (*disclaim_fn)(posix_spawnattr_t *, int);

// This process is a pure waiter and must not die from terminal signals, or it
// would orphan the running pi. It ignores these; the real pi is spawned with
// default dispositions restored so it reacts normally.
static const int kInteractiveSignals[] = {SIGINT,  SIGQUIT, SIGTERM, SIGHUP,
                                          SIGTSTP, SIGTTIN, SIGTTOU};
static const size_t kNumSignals =
    sizeof(kInteractiveSignals) / sizeof(kInteractiveSignals[0]);

// Spawn the real pi with the given argv and wait for it, staying alive as
// launcher code so this binary remains pi's TCC identity. On success writes the
// raw waitpid status to *out_status and returns 0; returns -1 on spawn/wait
// failure.
static int spawn_pi(char **argv, int *out_status) {
  posix_spawnattr_t attr;
  if (posix_spawnattr_init(&attr) != 0) {
    perror("pi-launcher: posix_spawnattr_init");
    return -1;
  }
  sigset_t defaults;
  sigemptyset(&defaults);
  for (size_t i = 0; i < kNumSignals; i++) {
    sigaddset(&defaults, kInteractiveSignals[i]);
  }
  posix_spawnattr_setsigdefault(&attr, &defaults);
  posix_spawnattr_setflags(&attr, POSIX_SPAWN_SETSIGDEF);

  pid_t pid;
  int rc = posix_spawn(&pid, PI_REAL, NULL, &attr, argv, environ);
  posix_spawnattr_destroy(&attr);
  if (rc != 0) {
    fprintf(stderr, "pi-launcher: posix_spawn %s: %s\n", PI_REAL, strerror(rc));
    return -1;
  }

  int status;
  while (waitpid(pid, &status, 0) < 0) {
    if (errno != EINTR) {
      perror("pi-launcher: waitpid");
      return -1;
    }
  }
  *out_status = status;
  return 0;
}

// A normal quit exits 0; anything else (a signal, or a non-zero exit from an
// uncaught exception) is treated as a crash worth recovering from.
static int is_crash(int status) {
  if (WIFSIGNALED(status)) {
    return 1;
  }
  return WEXITSTATUS(status) != 0;
}

// Translate a raw waitpid status into a process exit code.
static int status_to_exit(int status) {
  if (WIFSIGNALED(status)) {
    return 128 + WTERMSIG(status);
  }
  return WEXITSTATUS(status);
}

// pi's TUI can leave the tty in raw mode and the alternate screen after a crash.
// Put it back so the restart - and the give-up path - start on a clean, usable
// terminal.
static void restore_terminal(void) {
  static const char reset[] = "\033[?1049l"  // leave alternate screen
                              "\033[?25h"     // show cursor
                              "\033[0m"       // reset text attributes
                              "\033[?1000l"   // disable mouse tracking
                              "\033[?1006l"   // disable SGR mouse mode
                              "\033[?2004l";  // disable bracketed paste
  ssize_t n = write(STDOUT_FILENO, reset, sizeof(reset) - 1);
  (void)n;

  // Restore sane line discipline (cooked mode, echo and signals on).
  struct termios t;
  if (tcgetattr(STDIN_FILENO, &t) == 0) {
    t.c_lflag |= (ICANON | ECHO | ISIG | IEXTEN);
    t.c_iflag |= (ICRNL | BRKINT | IXON);
    t.c_oflag |= OPOST;
    tcsetattr(STDIN_FILENO, TCSANOW, &t);
  }
}

// Second entry: disclaimed and responsible for ourselves. Run the real pi and
// wait. On a clean quit, return pi's exit status. On a crash, restore the
// terminal and relaunch pi on the previous session (`--continue`) with a
// message asking the agent to continue, up to MAX_RESTARTS consecutive times.
static int run_pi(char **argv) {
  for (size_t i = 0; i < kNumSignals; i++) {
    signal(kInteractiveSignals[i], SIG_IGN);
  }
  unsetenv(FLAG);

  int status;
  if (spawn_pi(argv, &status) != 0) {
    return 1;
  }
  if (!is_crash(status)) {
    return status_to_exit(status);
  }

  // Relaunch with only --continue plus the crash message: replaying the user's
  // original argv could re-send an initial prompt or @files, and model/config
  // come from settings anyway.
  char *restart_argv[] = {(char *)"pi", (char *)"--continue",
                          (char *)CRASH_MESSAGE, NULL};
  for (int attempt = 1; attempt <= MAX_RESTARTS; attempt++) {
    fprintf(stderr,
            "pi-launcher: pi crashed; restoring session (attempt %d/%d)\n",
            attempt, MAX_RESTARTS);
    restore_terminal();
    if (spawn_pi(restart_argv, &status) != 0) {
      return 1;
    }
    if (!is_crash(status)) {
      return status_to_exit(status);
    }
  }

  restore_terminal();
  fprintf(stderr,
          "pi-launcher: pi crashed repeatedly; giving up after %d restarts\n",
          MAX_RESTARTS);
  return status_to_exit(status);
}

int main(int argc, char **argv) {
  (void)argc;

  if (getenv(FLAG) != NULL) {
    return run_pi(argv);
  }

  // First entry: re-exec ourselves in place (POSIX_SPAWN_SETEXEC) with disclaim
  // set, so this same pid becomes its own TCC-responsible process while still
  // running this launcher's code.
  char self[4096];
  uint32_t size = sizeof(self);
  if (_NSGetExecutablePath(self, &size) != 0) {
    fprintf(stderr, "pi-launcher: executable path too long\n");
    return 1;
  }

  setenv(FLAG, "1", 1);

  posix_spawnattr_t attr;
  if (posix_spawnattr_init(&attr) != 0) {
    perror("pi-launcher: posix_spawnattr_init");
    return 1;
  }
  posix_spawnattr_setflags(&attr, POSIX_SPAWN_SETEXEC);

  // Private libSystem symbol; resolve at runtime so a missing symbol on a future
  // macOS degrades to "no disclaim" (prompts return) rather than a build/link
  // failure.
  disclaim_fn disclaim =
      (disclaim_fn)dlsym(RTLD_DEFAULT, "responsibility_spawnattrs_setdisclaim");
  if (disclaim != NULL) {
    disclaim(&attr, 1);
  }

  // With POSIX_SPAWN_SETEXEC this replaces the current image and does not return
  // on success.
  posix_spawn(NULL, self, NULL, &attr, argv, environ);
  perror("pi-launcher: posix_spawn (setexec) self");
  posix_spawnattr_destroy(&attr);
  return 1;
}
