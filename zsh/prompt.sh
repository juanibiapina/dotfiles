# Enable dynamic prompt
setopt prompt_subst

prompt_start() {
  ROADRUNNER_PROMPT=
}

prompt_append() {
  ROADRUNNER_PROMPT=${ROADRUNNER_PROMPT}$1
}

prompt_end() {
  export ROADRUNNER_PROMPT
}

prompt_start
prompt_append '#{fg:%reset%}['
prompt_append '#{fg:%red%}%username%#{fg:%reset%}@#{fg:%magenta%}%hostname%'
prompt_append '#{fg:%reset%}:'
prompt_append '#{rbenv:#{fg:%green%}[Ruby %version%] }'
prompt_append '#{fg:%blue%}%cwd%'
prompt_append '#{git: #{fg:%reset%}({#{fg:%magenta%}%head%}{ #{fg:%reset%}{↓%behind%}{↑%ahead%}}{ {#{fg:%green%}●%index%}{#{fg:%red%}+%wt%}{#{fg:%reset%}…%untracked%}{#{fg:%green%}✓%clean%}}#{fg:%reset%})}'
prompt_append '#{fg:%reset%}]'
prompt_append '
:) '
prompt_end

PROMPT='$(~/development/roadrunner/target/release/roadrunner)'

RED="%{$(tput setaf 1)%}"
RESET="%{$(tput sgr0)%}"

# display exitcode on the right when >0
return_code="%(?..${RED}%? ↵${RESET})"

RPROMPT='(${LAST_COMMAND_TIME}ms) ${return_code}${RESET}'
