## Aliases for commands. The keys of the given dictionary are the
## aliases, while the values are the commands they map to.
## Type: Dict
c.aliases = {
    'h': 'help',
    'w': 'session-save',
    'q': 'close',
    'qa': 'quit',
    'wq': 'quit --save',
    'wqa': 'quit --save'
}

## Allow websites to show notifications.
## Type: BoolAsk
## Valid values:
##   - true
##   - false
##   - ask
c.content.notifications = False

## Open new windows in private browsing mode which does not record
## visited pages.
## Type: Bool
# c.content.private_browsing = False

## Editor (and arguments) to use for the `open-editor` command. The
## following placeholders are defined:  * `{file}`: Filename of the file
## to be edited. * `{line}`: Line in which the caret is found in the
## text. * `{column}`: Column in which the caret is found in the text. *
## `{line0}`: Same as `{line}`, but starting from index 0. * `{column0}`:
## Same as `{column}`, but starting from index 0.
## Type: ShellCommand
# c.editor.command = ['gvim', '-f', '{file}', '-c', 'normal {line}G{column0}l']

## Turn on Qt HighDPI scaling. This is equivalent to setting
## QT_AUTO_SCREEN_SCALE_FACTOR=1 or QT_ENABLE_HIGHDPI_SCALING=1 (Qt >=
## 5.14) in the environment. It's off by default as it can cause issues
## with some bitmap fonts. As an alternative to this, it's possible to
## set font sizes and the `zoom.default` setting.
## Type: Bool
c.qt.highdpi = False

## Enable smooth scrolling for web pages. Note smooth scrolling does not
## work with the `:scroll-px` command.
## Type: Bool
# c.scrolling.smooth = False

c.tabs.title.format = '{index}: {current_title}'
c.tabs.title.format_pinned = '{index}'

## Complete password from keypass
config.bind('<Ctrl-P>', 'spawn --userscript qute-keepass -p ~/Dropbox/passwords.kdbx', mode='insert')

## Quick help
config.bind('<Space>h', 'help')

## Github clone
config.bind('<Space>g', 'spawn --userscript github-clone.py')

## Disable register protocol handler
## This is the feature that allows websites to open mailto links
c.content.register_protocol_handler = False

with config.pattern("https://meet.google.com") as p:
    p.content.media.audio_capture = True
    p.content.media.audio_video_capture = True
    p.content.media.video_capture = True

with config.pattern("https://zenklub.com.br") as p:
    p.content.media.audio_video_capture = True
