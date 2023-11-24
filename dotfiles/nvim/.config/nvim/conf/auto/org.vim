" this variable exists so it can be overridden by tests
let g:gorg_done_filename = "Done.md"

" Treats the current line as a link and open that file
" First it looks for obsidian style links
" Otherwise it looks for items in the format '- Item'
function! s:open_file_for_current_line()
  let line = getline(".")
  let cursor_col = col(".")
  let pattern = '\v\[\[(.{-})\]\]'
  let matches = []
  let start = 0

  " Find all the matches for links
  while match(line, pattern, start) >= 0
    let match_pos = match(line, pattern, start)
    let match_text = matchstr(line, pattern, match_pos)
    let matches += [{'text': match_text, 'pos': match_pos}]
    let start = match_pos + strlen(match_text)
  endwhile

  if len(matches) == 0
    " If no pattern is found, strip leading '- ' and use the line if it's there
    if line =~ '^- '
      let filename = substitute(line, '^- ', '', '')
    else
      echo "No link found"
      return
    endif
  elseif len(matches) == 1
    " If there's only one link, use it
    let filename = matches[0]['text']
  else
    " If there are multiple links, find which one the cursor is on
    let on_link = 0
    for match in matches
      if cursor_col >= match['pos'] && cursor_col <= match['pos'] + strlen(match['text'])
        let filename = match['text']
        let on_link = 1
        break
      endif
    endfor
    if on_link == 0
      echo "Cursor is not on a link"
      return
    endif
  endif

  " Remove the surrounding [[ ]] from the filename
  let filename = substitute(filename, '\[\[\(.\{-}\)\]\]', '\1', '')

  " Append .md to the filename and open the file
  let filename = filename . ".md"

  exec 'edit ' . filename
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
