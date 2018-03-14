function! DetectTestRunner()
  for [root, value] in projectionist#query('runner')
    return value

    break
  endfor
endfunction
