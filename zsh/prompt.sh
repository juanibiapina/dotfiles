# Enable dynamic prompt
setopt prompt_subst

PROMPT='$(~/development/roadrunner/target/release/roadrunner ~/.roadrunner/prompt.lua)'

RED="%{$(tput setaf 1)%}"
RESET="%{$(tput sgr0)%}"

# display exitcode on the right when >0
return_code="%(?..${RED}%? ↵${RESET})"

RPROMPT='(${LAST_COMMAND_TIME}ms) ${return_code}${RESET}'
