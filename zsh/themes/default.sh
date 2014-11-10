# Enable dynamic prompt
setopt prompt_subst

_USERNAME="%{$RED%}%n%{$RESET%}"
_HOSTNAME="%{$MAGENTA%}%m%{$RESET%}"
_CWD="%{$BLUE%}%~%{$RESET%}"

declare -f rbenv_prompt_info > /dev/null
if [ $? -ne 0 ]; then
  rbenv_prompt_info() {
  }
fi

PROMPT='[${_USERNAME}@${_HOSTNAME}:$(rbenv_prompt_info)${_CWD}$(git_super_status)]
:) '

# display exitcode on the right when >0
return_code="%(?..%{$RED%}%? ↵%{$RESET%})"

RPROMPT='(${LAST_COMMAND_TIME}s) ${return_code}%{$RESET%}'
