for conf in split(globpath("~/.vim/conf/auto", "*.vim"), '\n')
  execute('source '.conf)
endfor
