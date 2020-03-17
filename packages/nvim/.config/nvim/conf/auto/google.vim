function! GoogleWordWithFiletype()
  let word = expand("<cword>")
  let url = "https://google.com/search?q=" . &filetype . " " . word

  silent exec "!open \"" . l:url . "\""
endfunction
