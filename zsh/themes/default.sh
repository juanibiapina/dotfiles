# Enable dynamic prompt
setopt prompt_subst

_USERNAME="%{$fg[red]%}%n%{$reset_color%}"
_HOSTNAME="%{$fg[magenta]%}%m%{$reset_color%}"
_CWD="%{$fg[blue]%}%~%{$reset_color%}"

declare -f rbenv_prompt_info > /dev/null
if [ $? -ne 0 ]; then
  rbenv_prompt_info() {
  }
fi

PROMPT='[${_USERNAME}@${_HOSTNAME}:$(rbenv_prompt_info)${_CWD}$(git_super_status)]
:) '

# display exitcode on the right when >0
return_code="%(?..%{$fg[red]%}%? ↵%{$reset_color%})"

RPROMPT="${return_code}%{$reset_color%}"
