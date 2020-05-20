function! DuckWordWithFiletype()
  let word = expand("<cword>")
  let url = "https://duckduckgo.com/search?q=" . &filetype . " " . word

  silent exec "!open \"" . l:url . "\""
endfunction
