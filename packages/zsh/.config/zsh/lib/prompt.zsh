# This is the code suggested by starship, but since it includes this extra
# unecessary process spawn, I've included the resolved full init directly.
#eval "$(starship init zsh)"

source <(starship init zsh --print-full-init)

# snippet to measure prompt time
#typeset -F SECONDS start
#
#precmd () {
#    start=$SECONDS
#}
#
#zle-line-init () {
#     PREDISPLAY="[$(( $SECONDS - $start ))] "
#}
#zle -N zle-line-init
