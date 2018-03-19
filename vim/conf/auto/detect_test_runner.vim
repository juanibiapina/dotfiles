function! DetectTestRunner(file) abort
  for [root, value] in projectionist#query('runner', { "file": a:file })
    return value

    break
  endfor

  throw "No runner found for file: " . a:file
endfunction

function! MakeTestCommand() abort
  let l:file = expand('%:p')

  let l:test = 0
  for [root, value] in projectionist#query('test')
    let l:test = value
    break
  endfor

  if !l:test
    for file in projectionist#query_file('alternate')
      let l:file = file
      break
    endfor
  endif

  for [root, value] in projectionist#query('test', { "file": l:file })
    let l:test = value
    break
  endfor

  if !l:test
    throw "No test found for current file"
  endif

  return DetectTestRunner(l:file) . " " . l:file
endfunction
