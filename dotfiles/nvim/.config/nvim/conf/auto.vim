" Load all auto configs in vimscript
for conf in split(globpath("~/.config/nvim/conf/auto", "*.vim"), '\n')
  execute('source '.conf)
endfor

" Load all auto configs in lua
for conf in split(globpath("~/.config/nvim/conf/auto", "*.lua"), '\n')
  execute('luafile '.conf)
endfor
