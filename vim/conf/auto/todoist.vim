function! TodoistReadInbox()
  let items = systemlist("dev todoist list")
  let items = map(items, '"- " . v:val')
  call append(line('.'), items)
endfunction
