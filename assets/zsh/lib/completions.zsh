# Load and run compinit.
#
# compinit's security audit (compaudit) stats every fpath dir and costs ~70ms.
# Run the full audit at most once every ~20h; otherwise load the cached dump
# with -C, which skips the audit. The (Nmh-20) glob qualifier matches the dump
# only when it exists AND was modified less than 20 hours ago, so a missing or
# stale dump falls through to a full rebuild. Uses an array (not [[ -n ... ]],
# which does not glob) and the bare qualifier (not (#q...), which needs
# extended_glob).
#
# Trade-off: a newly installed tool's completions may not appear until the dump
# refreshes (<=20h) or you run `rm ~/.zcompdump`.
autoload -Uz compinit
_zdump="${ZDOTDIR:-$HOME}/.zcompdump"
_zdump_fresh=(${_zdump}(Nmh-20))
if (( $#_zdump_fresh )); then
  compinit -C -i -d "$_zdump"
else
  compinit -i -d "$_zdump"
fi
unset _zdump _zdump_fresh

unsetopt menu_complete   # do not autoselect the first completion entry
setopt auto_menu         # show completion menu on succesive tab press

setopt complete_in_word  # in word completion
setopt always_to_end

WORDCHARS=''

zmodload -i zsh/complist

## all, partial-word and then substring completion
zstyle ':completion:*' matcher-list 'r:|[._-]=* r:|=*' 'l:|=* r:|=*'

zstyle ':completion:*' list-colors ''
zstyle ':completion:*:*:*:*:*' menu select
zstyle ':completion:*:*:kill:*:processes' list-colors '=(#b) #([0-9]#) ([0-9a-z-]#)*=01;34=0=01'
zstyle ':completion:*:*:*:*:processes' command "ps -u $USERNAME -o pid,user,comm -w -w"

# disable named-directories autocompletion
zstyle ':completion:*:cd:*' tag-order local-directories directory-stack path-directories
cdpath=(.)

# Use caching so that commands like apt and dpkg complete are useable
zstyle ':completion::complete:*' use-cache 1
#zstyle ':completion::complete:*' cache-path ~/.oh-my-zsh/cache/

expand-or-complete-with-dots() {
  echo -n "\e[31m......\e[0m"
  zle expand-or-complete
  zle redisplay
}
zle -N expand-or-complete-with-dots
bindkey "^I" expand-or-complete-with-dots
