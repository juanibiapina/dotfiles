#!/usr/bin/env python3

from bs4 import BeautifulSoup
import os
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

# Extract current page URL from environment set by qutebrowser
url = os.getenv("QUTE_URL")

# run `dev start $url` to start a local development dession
with Popen(["/usr/bin/zsh", "-i", "-c", "dev start {}".format(url)], stdout=PIPE, stderr=STDOUT, text=True) as p:
    html = "<p>" + p.stdout.read().replace("\n", "</p><p>") + "</p>"
    send_html(html)
    #with open(os.getenv("QUTE_FIFO"), 'w') as f:
        #for line in p.stdout:
        #    f.write("message-info \"{}\"".format(line.strip()))
