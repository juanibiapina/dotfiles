# this is required because go completions are not
# configured to be autoloaded
if [ -e /usr/local/share/zsh/site-functions/_go ]; then
  source /usr/local/share/zsh/site-functions/_go
fi
