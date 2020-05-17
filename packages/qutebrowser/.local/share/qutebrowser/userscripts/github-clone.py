#!/usr/bin/env python3

from bs4 import BeautifulSoup
import os
import sys
import tempfile
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
    qute_fifo.write("message-info \"Cloning {}\"\n".format(url))
    qute_fifo.flush()

    # run `dev start $url` to start a local development dession
    with Popen(["/usr/bin/zsh", "-i", "-c", "dev start {}".format(url)], stdout=PIPE, stderr=STDOUT, text=True) as p:
        #html = "<p>" + p.stdout.read().replace("\n", "</p><p>") + "</p>"
        #send_html(html)
        while True:
            line = p.stdout.readline()
            if not line: break
            qute_fifo.write("message-info \"{}\"\n".format(line.strip()))
            qute_fifo.flush()

    qute_fifo.write("message-info Done\n")
    qute_fifo.flush()
