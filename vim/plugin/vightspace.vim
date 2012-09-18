" create the highlight
highlight ExtraWhitespace ctermbg=red guibg=red

" highlight whitespaces
fun! HighlightWhitespace()
  match ExtraWhitespace /\s\+$/
endfun

" highlight whitespaces on other lines (for insert mode)
fun! HightlightWhitespacesOnOtherLines()
  match ExtraWhitespace /\s\+\%#\@<!$/
endfun

" match trailing whitespaces
autocmd BufWinEnter * call HighlightWhitespace()
autocmd InsertEnter * call HightlightWhitespacesOnOtherLines()
autocmd InsertLeave * call HighlightWhitespace()
autocmd BufWinLeave * call clearmatches()

" clear trailing whitespaces
autocmd BufWritePre *.* :%s/\s\+$//e
