#!/usr/bin/env python3

import os
import re
import sys
import tempfile
import subprocess
from subprocess import Popen, PIPE, STDOUT

def send_html(text):
    fifo = os.getenv('QUTE_FIFO')
    if not fifo:
        return

    with tempfile.NamedTemporaryFile(mode='w', prefix='qutescript_', suffix='.html', delete=False) as out_file:
        out_file.writelines(text)

        with open(fifo, 'w') as fifo_file:
            fifo_file.write('open -t file://{}\n'.format(os.path.abspath(out_file.name)))

with open(os.getenv("QUTE_FIFO"), 'w') as qute_fifo:
    # Extract current page URL from environment set by qutebrowser
    url = os.getenv("QUTE_URL")

    # Extract name from URL
    name = re.match(r"https://github.com/([^/]+/[^/|^?|^&]+)", url).group(1)

    qute_fifo.write("message-info \"Name: {}\"\n".format(name))
    qute_fifo.flush()

    # run `dev start $url` to start a local development session
    with Popen(["zsh", "-i", "-c", "dev start https://github.com/{}".format(name)], stdout=PIPE, stderr=STDOUT, text=True) as p:
        #html = "<p>" + p.stdout.read().replace("\n", "</p><p>") + "</p>"
        #send_html(html)
        while True:
            line = p.stdout.readline()
            if not line: break
            qute_fifo.write("message-info \"{}\"\n".format(line.strip()))
            qute_fifo.flush()

    qute_fifo.write("message-info \"Done: {}\"\n".format(name))
    qute_fifo.flush()

    guess_name = re.sub(r"[^/]*/", "", name).replace(".", "-")

    # Switch the first tmux client to the newly created session (guessing the name as `dev open` would do it)
    subprocess.run(["zsh", "-i", "-c", "tmux switch-client -c /dev/pts/0 -t {}".format(guess_name)], stdout=PIPE, stderr=STDOUT, text=True)
