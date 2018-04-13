function! TermRun(cmd)
  let s:last_cmd = a:cmd

  call neoterm#do({"cmd": a:cmd})
  call neoterm#open({})
endfunction

function! TermRunLast()
  if exists("s:last_cmd")
    call neoterm#do({"cmd": s:last_cmd})
    call neoterm#open({})
  else
    echom "TermRun: no last command"
  endif
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
