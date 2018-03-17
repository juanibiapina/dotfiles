LAST_VIM="vim"

nv() {
  if [ "$LAST_VIM" = "vim" ]; then
    LAST_VIM="nvim"
  else
    LAST_VIM="vim"
  fi

  $LAST_VIM
}
