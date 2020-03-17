alias g=git

# disable git autocompletion
__git_files () {
  _wanted files expl 'local files' _files
}

parse_git_branch(){
  git branch --no-color 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/(\1)/'
}

parse_git_branch_full() {
  local DIRTY STATUS
  STATUS=$(git status --porcelain 2>/dev/null)
  [ $? -eq 128 ] && return
  [ -z "$(echo "$STATUS" | grep -e '^ [M]')"   ] || DIRTY="*"
  [ -z "$(echo "$STATUS" | grep -e '^?? ')"    ] || DIRTY="*"
  [ -z "$(echo "$STATUS" | grep -e '^[MDA]')"  ] || DIRTY="${DIRTY}+"
  [ -z "$(git stash list)"                     ] || DIRTY="${DIRTY}^"
  AHEAD=$(git status 2>/dev/null | grep -e 'ahead of' | awk '{ print $9; }')
  [ -z "${AHEAD}"                              ] || DIRTY="${DIRTY}!"
  echo " ($(git branch 2>/dev/null | sed -e '/^[^*]/d' -e 's/* //')$DIRTY)"
}
