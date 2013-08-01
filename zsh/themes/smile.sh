PROMPT=':) '

# display exitcode on the right when >0
return_code="%(?..%{$fg[red]%}%? ↵%{$reset_color%})"
RPROMPT="${return_code}%{$reset_color%}"
