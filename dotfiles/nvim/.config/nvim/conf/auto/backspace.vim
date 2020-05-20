function! s:back()
  let current_buffer = bufnr("%")

  while 1
    execute "normal \<C-O>"
    let new_buffer = bufnr("%")

    if new_buffer != current_buffer
      break
    endif
  endwhile
endfunction

map <BS> :call <SID>back()<CR>
