# Juan's Dotfiles

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [About](#about)
- [Dependencies](#dependencies)
- [Resources](#resources)
  - [Alacritty](#alacritty)
  - [neovim](#neovim)
  - [Source Code Pro](#source-code-pro)
  - [tmux](#tmux)
  - [zsh](#zsh)
- [Inspiration](#inspiration)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## About

These are my personal dotfiles. They are optimized for performance and high
productivity in the terminal.

## Dependencies

- Git
- Make
- GNU Stow

## Resources

### [Alacritty](https://github.com/alacritty/alacritty)

My terminal emulator is Alacritty. It has some bugs once in a while, and it's
not as correct as [iterm](https://iterm2.com/) in general, but it's the fastest
I could find and the configuration file can be easily version controlled. It
doesn't support tabs (for that I use `tmux`). Also iterm development processes
are old, and I'd rather not support that.
[Kitty](https://sw.kovidgoyal.net/kitty/) is also incredibly fast, but it's
weird in many ways and I don't support the attitude of the creator.

### [neovim](https://neovim.io/)

My preferred editor is Neovim. It removes a bunch of unused stuff from vim, and
I support their attitude and development model. Vim itself is great, but their
development model is still from the eighties and doesn't feel very inclusive.
Neovim also renders faster. I'm not able to deal with the complexity of
[Emacs](https://www.gnu.org/software/emacs/) or even
[Spacemacs](https://www.spacemacs.org/), though I take a lot of inspiration
from the latter, specially the shortcuts.

### [Source Code Pro](https://github.com/adobe-fonts/source-code-pro)

Source Code Pro is my monospaced font of choice. I've also used
[Hack](https://sourcefoundry.org/hack/) for a long time in the past. The font
is installed with `Brew`.

### [tmux](https://github.com/tmux/tmux)

I use tmux as a terminal multiplexer. I had problems with
[screen](https://www.gnu.org/software/screen/) many years ago, switched to tmux
and never looked back.

### [zsh](https://www.zsh.org/)

Zsh is my shell of choice. It improves on
[bash](https://www.gnu.org/software/bash/) but keeps a somewhat POSIX compliant
syntax. [fish](https://fishshell.com/) has some cool features but is scripted
in its own language, which brings its own learning curve and quirks. Using a
known, common language is usually better for communication and research. I've
tried [ion](https://github.com/redox-os/ion) but stopped because it couldn't
tell which line of a script had a syntax error. I wish I could use my own shell
one day, like [lish](https://github.com/juanibiapina/lish), but I'm too
used to normal shell syntax to let go of it easily.

## Inspiration

Awesome lists are a great resource to find new command line tools.

- https://github.com/alebcay/awesome-shell
- https://github.com/agarrharr/awesome-cli-apps
- https://github.com/k4m4/terminals-are-sexy

Github also provides a bunch of guidelines on how to do dotfiles:

- https://dotfiles.github.io/
