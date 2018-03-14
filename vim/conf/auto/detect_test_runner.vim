function! DetectTestRunner()
  if !empty(glob("bin/spring"))
    return "spring rspec"
  endif

  if !empty(glob("spec"))
    return "bundle exec rspec"
  endif
endfunction
