function! s:detectTestRunner(file) abort
  for [root, value] in projectionist#query('runner', { "file": a:file })
    return value

    break
  endfor

  throw "No runner found for file: " . a:file
endfunction

function! LocalTestCommand() abort
  let l:file = expand('%:p')
  let l:line_part = ":" . line('.')

  " determine if current file is a test
  let l:test = 0
  for [root, value] in projectionist#query('test')
    let l:test = value
    break
  endfor

  " if it's not a test, find alternate file and reset line part
  if !l:test
    for file in projectionist#query_file('alternate')
      let l:file = file
      let l:line_part = ""
      break
    endfor
  endif

  " determine if alternate file is a test
  for [root, value] in projectionist#query('test', { "file": l:file })
    let l:test = value
    break
  endfor

  if !l:test
    throw "No test found for current file"
  endif

  return s:detectTestRunner(l:file) . " " . l:file . l:line_part
endfunction

function! FileTestCommand() abort
  let l:file = expand('%:p')

  " determine if current file is a test
  let l:test = 0
  for [root, value] in projectionist#query('test')
    let l:test = value
    break
  endfor

  " if it's not a test, find alternate file
  if !l:test
    for file in projectionist#query_file('alternate')
      let l:file = file
      break
    endfor
  endif

  " determine if alternate file is a test
  for [root, value] in projectionist#query('test', { "file": l:file })
    let l:test = value
    break
  endfor

  if !l:test
    throw "No test found for current file"
  endif

  return s:detectTestRunner(l:file) . " " . l:file
endfunction
