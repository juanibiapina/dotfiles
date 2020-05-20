for conf in split(globpath("~/.config/nvim/conf/auto", "*.vim"), '\n')
  execute('source '.conf)
endfor
