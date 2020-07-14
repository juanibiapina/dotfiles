" Treats the current line as a link and open that file
function! s:open_file_for_current_line()
  let line = getline(".")
  let line = substitute(line, '^- ', '', '')
  let filename = line . ".md"

  exec 'edit' l:filename
endfunction

nnoremap <Plug>GorgOpenFileForCurrentLine :call <SID>open_file_for_current_line()<CR>

command! -nargs=1 -bar GorgOpenFile edit <args>
