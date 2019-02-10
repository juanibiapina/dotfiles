# Enable dynamic prompt
setopt prompt_subst

export ROADRUNNER_PROMPT='#{fg(reset)};[#{fg(red)}#{username()}#{fg(reset)}@#{fg(magenta)}#{hostname()}#{fg(reset)}:;?rbenv:#{fg(green)}[Ruby #{version}] ;#{fg(blue)}#{cwd()};?git: #{fg(reset)}({#{fg(magenta)}#{tr(head)}}{ #{fg(reset)}{↓#{tr(behind)}}{↑#{tr(ahead)}}}{ {#{fg(green)}●#{tr(index)}}{#{fg(red)}+#{tr(wt)}}{#{fg(reset)}…#{tr(untracked)}}{#{fg(green)}✓#{tr(clean)}}}#{fg(reset)});#{fg(reset)}]
:) '

PROMPT='$(~/development/roadrunner/target/release/roadrunner)'

RED="%{$(tput setaf 1)%}"
RESET="%{$(tput sgr0)%}"

# display exitcode on the right when >0
return_code="%(?..${RED}%? ${RESET})"

RPROMPT='(${LAST_COMMAND_TIME}ms) ${return_code}${RESET}'
