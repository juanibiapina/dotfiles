function! DuckWordWithFiletype()
  let word = expand("<cword>")
  let url = "https://duckduckgo.com/?q=" . &filetype . " " . word

  silent exec "!xdg-open \"" . l:url . "\""
endfunction
