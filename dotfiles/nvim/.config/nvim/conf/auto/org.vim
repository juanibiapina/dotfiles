" Move current line to done file for current day
function! s:move_to_done()
  let line = getline(".")
  let current_date = strftime("%Y-%m-%d")

  call mkdir("done", "p")

  exec "silent ! echo " . "\"" . line . "\"" . " >> done/" . current_date . ".md"

  call deletebufline(bufname("%"), line("."))
endfunction

" Treats the current line as a link and open that file
function! s:open_file_for_current_line()
  let line = getline(".")
  let line = substitute(line, '^- ', '', '')
  let filename = line . ".md"

  exec 'edit' l:filename
endfunction

nnoremap <Plug>GorgMoveDone :call <SID>move_to_done()<CR>
nnoremap <Plug>GorgOpenFileForCurrentLine :call <SID>open_file_for_current_line()<CR>

command! -nargs=1 -bar GorgOpenFile edit <args>
