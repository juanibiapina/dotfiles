let g:rustfmt_autosave = 1
let g:rustfmt_command = 'cargo fmt'

autocmd BufRead *.rs :setlocal tags=./rusty-tags.vi;/
