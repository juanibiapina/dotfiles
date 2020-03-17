function! TodoistReadInbox()
  let items = systemlist("dev todoist list")
  let items = map(items, '"- " . v:val')
  call append(line('.'), items)
endfunction

function! TodoistAddItemToInbox()
  let line = getline(".")
  let line = substitute(line, '^- ', '', '')
  call system("dev todoist add \"" . line . "\"")
  call deletebufline(bufname("%"), line("."))
endfunction
