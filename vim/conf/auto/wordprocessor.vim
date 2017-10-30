func! WordProcessorMode()
  map j gj
  map k gk
  setlocal spell spelllang=en_us
  set complete+=s
  setlocal wrap
  setlocal linebreak
endfu

command! WP call WordProcessorMode()
