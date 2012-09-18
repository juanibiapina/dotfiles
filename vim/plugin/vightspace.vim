" create the highlight
highlight ExtraWhitespace ctermbg=red guibg=red

" highlight whitespaces
fun! HighlightWhitespace()
  if exists('b:vightNoHighlight')
    return
  endif
  match ExtraWhitespace /\s\+$/
endfun

" highlight whitespaces on other lines (for insert mode)
fun! HightlightWhitespacesOnOtherLines()
  if exists('b:vightNoHighlight')
    return
  endif
  match ExtraWhitespace /\s\+\%#\@<!$/
endfun

" match trailing whitespaces
autocmd BufWinEnter * call HighlightWhitespace()
autocmd InsertEnter * call HightlightWhitespacesOnOtherLines()
autocmd InsertLeave * call clearmatches() | call HighlightWhitespace()
autocmd BufWinLeave * call clearmatches()

" clear trailing whitespaces before writing
autocmd BufWritePre *.* :%s/\s\+$//e

" disable highlight for conque_term
autocmd FileType conque_term let b:vightNoHighlight=1
autocmd FileType conque_term call clearmatches()
autocmd FileType conque_term call HighlightWhitespace()
