source <(starship init zsh) # DOCS:docs/starship-init.md

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
