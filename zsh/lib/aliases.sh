alias nat='sudo iptables -t nat'
alias iptables='sudo iptables'

alias webserverhere='sudo python -m SimpleHTTPServer'

# enable color support of ls and also add handy aliases
if [ -x /usr/bin/dircolors ]; then
  test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
  alias ls='ls --color=auto'

  alias grep='grep --color=auto'
fi

# cat for code
alias catcode='highlight -s vim-dark -M'
