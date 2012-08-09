# Update brazil-build sources
up ()
{
    (gg bb; rake $1)
}

send_modified_files() {
  if [ "$#" -ne "1" ]; then echo "Usage: send_modified_files /path/on/vm/to/workspace/project" >&2; return 1; fi

  git ls-files --modified | while read line
do
  from="$line";
  to="${1}/${line#*/}";
  echo /bin/cp -f "'${from}'" "'${to}'"
  mkdir -p "$(dirname "${to}")"
  /bin/cp -f "${from}" "${to}"
done
}

send_uncommited_files() {
  if [ "$#" -ne "1" ]; then echo "Usage: send_uncommited_files /path/on/vm/to/workspace/project" >&2; return 1; fi

  git status --porcelain | cut -c4- | sort | uniq | while read line
do
  from="$line";
  to="${1}/${line#*/}";
  echo /bin/cp -f "'${from}'" "'${to}'"
  mkdir -p "$(dirname "${to}")"
  /bin/cp -f "${from}" "${to}"
done
}

send_commits() {
  if [ "$#" -ne "2" ]; then echo "Usage: send_commits number-of-commits /path/to/mounted/workspace/project" >&2; return 1; fi

  git log --name-status -n "$1" | grep '^[A-Z][[:space:]]\+.*/.*' | sort -k2 | uniq -f1 | while read fstatus line;
do
  from="$line";
  to="${2}/${line#*/}";
  case "$fstatus" in
    A|M)
      echo /bin/cp -f "'${from}'" "'${to}'"
      mkdir -p "$(dirname "${to}")"
      /bin/cp -f "${from}" "${to}"
      ;;
    D)
      echo "Deleting file: $to"
      /bin/rm -f "$to"
      ;;
  esac
  echo "---- ---- ---- ---- ----"
done
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
