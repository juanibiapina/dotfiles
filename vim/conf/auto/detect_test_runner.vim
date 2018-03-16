function! DetectTestRunner(file)
  for [root, value] in projectionist#query('runner', { "file": a:file })
    return value

    break
  endfor
endfunction

function! MakeTestCommand()
  let l:file = expand('%')

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

  return DetectTestRunner(l:file) . " " . l:file
endfunction
