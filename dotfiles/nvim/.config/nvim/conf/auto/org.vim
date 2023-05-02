" this variable exists so it can be overridden by tests
let g:gorg_done_filename = "Done.md"

" Treats the current line as a link and open that file
function! s:open_file_for_current_line()
  let line = getline(".")
  let line = substitute(line, '^- ', '', '')
  let filename = line . ".md"

  exec 'edit' l:filename
endfunction

" Moves the current line to a file called Done.md under a section with the current ISO date
function! s:complete_item()
  let l:today = strftime("%Y-%m-%d")
  let l:done_filename = g:gorg_done_filename
  let l:current_line = getline(".")

  " Read the contents of Done.md
  let l:done_contents = readfile(l:done_filename)

  " Check if the section with the current date already exists
  let l:section_exists = 0
  for l:i in range(len(l:done_contents))
    if l:done_contents[l:i] == '# ' . l:today
      let l:section_exists = 1
      break
    endif
  endfor

  " If the section doesn't exist, create it and append the current line
  if l:section_exists == 0
    call add(l:done_contents, '# ' . l:today)
  endif

  " Append the current line to the section (assuming it's the last one)
  call add(l:done_contents, l:current_line)

  " Save the changes to Done.md
  call writefile(l:done_contents, l:done_filename)

  " Delete the current line from the original file
  execute 'delete'
endfunction

nnoremap <Plug>GorgOpenFileForCurrentLine :call <SID>open_file_for_current_line()<CR>
nnoremap <Plug>GorgCompleteItem :call <SID>complete_item()<CR>

command! -nargs=1 -bar GorgOpenFile edit <args>
