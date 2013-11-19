noremap <Leader>F  :FufFile **/<CR>
noremap <Leader>b  :FufBuffer<CR>

" setting exclude path for fuzzy finder removing /tmp and /vendor folders
let g:fuf_file_exclude = '\v\~$|\.(o|exe|dll|bak|orig|swp)$|(^|[/\\])\.(hg|git|bzr)($|[/\\])|(^|[/\\])(tmp|vendor)($|[/\\])'
