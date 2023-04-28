" Open Gitub repo in current line on the browser
function! OpenGithubRepo()
  " extract first occurence of username/repo from current line
  let repo = matchstr(getline('.'), '\v(\w|\.|\-)+\/(\w|\.|\-)+')

  " build repo url
  let url = "https://github.com/" . repo

  " open repo in browser
  if has('mac')
    silent! exec "!open \"" . l:url . "\""
  else
    silent! exec "!xdg-open \"" . l:url . "\""
  endif
endfunction
