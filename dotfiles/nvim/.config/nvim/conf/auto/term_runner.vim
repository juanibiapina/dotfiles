function! TermRun(cmd)
  if &autowrite || &autowriteall
    silent! wall
  endif

  call neoterm#do({"cmd": a:cmd})
  call neoterm#open({})
  "call system("dev tmux run " . a:cmd)
endfunction
