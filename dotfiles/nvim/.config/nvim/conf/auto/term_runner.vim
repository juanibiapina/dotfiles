function! TermRun(cmd)
  if &autowrite || &autowriteall
    silent! wall
  endif

  "call neoterm#do({"cmd": a:cmd})
  "call neoterm#open({})
  call system("dev tmux run " . a:cmd)
endfunction

function! TermToggle()
  call neoterm#toggle({})
endfunction

function! TermDestroy()
  call neoterm#close({"force": 1})
endfunction

function! TermInterrupt()
  call neoterm#kill({})
endfunction
