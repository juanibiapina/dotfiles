PROMPT="[%{$fg[red]%}%n%{$reset_color%}@%{$fg[magenta]%}%m%{$reset_color%}:%{$fg[blue]%}%~%{$reset_color%}]
:) "

# display exitcode on the right when >0
return_code="%(?..%{$fg[red]%}%? ↵%{$reset_color%})"

RPROMPT="${return_code}%{$reset_color%}"
